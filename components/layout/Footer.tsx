
import React from 'react';
import { PlatformSettings } from '../../types';
import { YoutubeIcon, FacebookIcon, InstagramIcon, WhatsAppIcon, QuestionMarkCircleIcon, CodeIcon } from '../common/Icons';
import { getSocialLinks } from '../../data/socialLinks';

interface FooterProps {
    settings: PlatformSettings;
}

const Footer: React.FC<FooterProps> = ({ settings }) => {
    const links = getSocialLinks(settings);

    return (
        <footer className="py-12 bg-[var(--bg-secondary)] border-t border-[var(--border-primary)] relative z-20 overflow-hidden">
             <div className="container mx-auto px-6 mb-12">
                 <h3 className="text-xl font-black text-[var(--text-primary)] text-center mb-8">تواصل معنا</h3>
                 <div className="flex justify-center">
                     <div className="flex overflow-x-auto gap-4 p-2 no-scrollbar max-w-full">
                         {links.map((contact) => (
                             <a 
                                key={contact.id}
                                href={contact.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex flex-col items-center justify-center w-24 h-24 rounded-2xl ${contact.bg} text-white shadow-lg transform transition-all hover:-translate-y-1 hover:shadow-xl flex-shrink-0 group`}
                             >
                                 <contact.icon className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                                 <span className="text-sm font-black">{contact.label}</span>
                             </a>
                         ))}
                     </div>
                 </div>
             </div>

            <div className="container mx-auto px-6 text-center">
                 <div className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-4">
                     © {new Date().getFullYear()} {settings?.platformName || 'Gstudent'}. جميع الحقوق محفوظة
                 </div>
                 <div className="flex flex-col items-center gap-2 mt-2 opacity-60 hover:opacity-100 transition-opacity">
                    <a 
                        href="https://www.facebook.com/share/1K4Qd7DGbS/" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="group flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-500 transition-colors bg-blue-500/5 px-4 py-1.5 rounded-full border border-blue-500/10"
                    >
                        <CodeIcon className="w-3 h-3 transition-transform group-hover:rotate-12" />
                        <span>تم التطوير من خلال KF Tech لتطوير المواقع والتطبيقات</span>
                    </a>
                 </div>
            </div>
        </footer>
    );
};

export default Footer;
