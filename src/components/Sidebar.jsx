import React from 'react';
import { FileText, MessageSquare, Settings } from 'lucide-react';

export default function Sidebar() {
    return (
        <nav className="side-nav">
            <div className="logo">α</div>
            <div className="nav-icons">
                <FileText className="active" />
                <MessageSquare />
                <Settings />
            </div>
        </nav>
    );
}
