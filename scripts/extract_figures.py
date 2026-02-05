import fitz  # PyMuPDF
import json
import os
import re

# --- 配置区域 ---
# 1. 路径配置
pdf_path = "../public/2208.11144v1.pdf"
output_dir = "../public/extracted_assets"

# 2. 过滤阈值配置
# 最小宽度/高度 (像素)：小于此值的图片将被视为图标/杂质丢弃
MIN_DIMENSION = 200  
# 极端长宽比过滤：丢弃过细或过扁的装饰线条 (比如长宽比大于 8 或小于 1/8)
MAX_ASPECT_RATIO = 8.0
# ----------------

def normalize_rect(rect, page_height):
    """将 PDF 坐标转换为更符合阅读习惯的坐标 (左上角为 0,0)"""
    return [rect.x0, page_height - rect.y1, rect.x1, page_height - rect.y0]

def find_nearby_caption(page, bbox, page_height):
    """
    尝试寻找图片上方或下方的文本作为潜在的 Caption (注释)。
    这是一个简单的启发式搜索，不保证 100% 准确。
    """
    # 定义搜索区域：图片上方 100px 和下方 100px 的全宽区域
    search_margin = 100
    
    # 上方区域 rect (注意 PDF 坐标系 Y 轴向上)
    top_rect = fitz.Rect(bbox.x0 - 50, bbox.y1, bbox.x1 + 50, bbox.y1 + search_margin)
    # 下方区域 rect
    bottom_rect = fitz.Rect(bbox.x0 - 50, bbox.y0 - search_margin, bbox.x1 + 50, bbox.y0)
    
    # 获取这两个区域内的文本
    top_text = page.get_text("text", clip=top_rect).strip()
    bottom_text = page.get_text("text", clip=bottom_rect).strip()

    # 简单的正则匹配，寻找类似 "Fig" 或 "Figure" 的开头
    caption_pattern = re.compile(r'^(Fig|Figure|Table)\.?\s*\d+', re.IGNORECASE)
    
    potential_caption = ""
    # 优先采用符合 Figure 命名规范的文本
    if caption_pattern.match(bottom_text):
        potential_caption = bottom_text # 大部分论文 Caption 在下方
    elif caption_pattern.match(top_text):
        potential_caption = top_text    # 表格 Caption 通常在上方
    else:
        # 如果都没匹配上规范，但也发现了文本，就先存着，让前端决定显不显示
        potential_caption = bottom_text if bottom_text else top_text

    # 只取前 200 个字符作为预览
    return potential_caption[:200].replace('\n', ' ') if potential_caption else None

def run_extraction():
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"创建目录: {output_dir}")

    doc = fitz.open(pdf_path)
    metadata = []
    processed_hashes = set() # 用于去重 (比如每一页都出现的 Logo)

    print(f"开始处理 PDF，共 {len(doc)} 页...")

    for page_idx in range(len(doc)):
        page = doc[page_idx]
        # 获取页面所有图片对象
        image_list = page.get_images(full=True)
        
        # 获取页面所有文本块 (用于后续判断周围环境，暂时没用到深度判断，但留了接口)
        # text_blocks = page.get_text("blocks") 

        print(f"-> 第 {page_idx + 1} 页: 发现 {len(image_list)} 个原始图像对象")

        extracted_count_on_page = 0

        for img_idx, img in enumerate(image_list):
            xref = img[0]
            
            # --- [核心升级 1]：去重 ---
            # 计算图片数据的哈希值，如果已经在其他页面处理过一模一样的图，就跳过
            img_hash = hash(img[1:]) # 使用图片对象的元数据做粗略哈希
            if img_hash in processed_hashes:
                # print(f"   [跳过] 重复图片 (xref: {xref})")
                continue

            # --- [核心升级 2]：获取位置信息 (BBox) ---
            # get_image_rects 返回图片在页面上出现的所有位置列表
            rects = page.get_image_rects(xref)
            if not rects: continue # 极少情况，图片存在但未被放置在页面上
            
            # 我们只取第一个出现的位置作为主要位置
            bbox = rects[0] 

            # 获取像素数据用于尺寸判断
            pix = fitz.Pixmap(doc, xref)

            # --- [核心升级 3]：尺寸和比例过滤 ---
            width, height = pix.width, pix.height
            if width <= 0 or height <= 0: continue
            
            aspect_ratio = width / height

            is_too_small = width < MIN_DIMENSION or height < MIN_DIMENSION
            is_extreme_ratio = aspect_ratio > MAX_ASPECT_RATIO or aspect_ratio < (1 / MAX_ASPECT_RATIO)

            if is_too_small or is_extreme_ratio:
                print(f"   [过滤] 丢弃小图或杂质: {width}x{height} (xref: {xref})")
                pix = None
                continue
            
            # --- 如果通过了过滤，开始处理 ---
            processed_hashes.add(img_hash) # 标记为已处理
            extracted_count_on_page += 1

            # 转换颜色空间
            if pix.n - pix.alpha > 3:
                pix = fitz.Pixmap(fitz.csRGB, pix)
            
            # 保存图片
            img_filename = f"p{page_idx + 1}_{img_idx + 1}_{xref}.png"
            save_path = os.path.join(output_dir, img_filename)
            pix.save(save_path)
            
            # --- [核心升级 4]：寻找附近的 Caption (注释) ---
            detected_caption = find_nearby_caption(page, bbox, page.rect.height)

            # 添加元数据
            metadata.append({
                "id": f"p{page_idx + 1}_i{img_idx}_{xref}",
                "url": f"/extracted_assets/{img_filename}",
                "page": page_idx + 1,
                "width": width,
                "height": height,
                # 存储标准化后的坐标 [x0, y0, x1, y1]
                "bbox": normalize_rect(bbox, page.rect.height),
                # 存储探测到的潜在 Caption
                "detectedCaption": detected_caption,
                # 标记类型，目前都是 figure，未来可以扩展
                "type": "figure"
            })
            pix = None
        
        print(f"   -> 第 {page_idx + 1} 页处理完毕，有效提取 {extracted_count_on_page} 张图片。")

    # 保存元数据
    metadata_path = os.path.join(output_dir, "metadata.json")
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=4, ensure_ascii=False)
    
    print(f"\n=====================")
    print(f"全部完成！")
    print(f"共提取有效图片: {len(metadata)} 张")
    print(f"元数据已保存至: {metadata_path}")
    print(f"=====================")

if __name__ == "__main__":
    run_extraction()