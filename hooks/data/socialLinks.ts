
import { 
    WhatsAppIcon, 
    InstagramIcon, 
    FacebookIcon, 
    YoutubeIcon, 
    QuestionMarkCircleIcon 
} from '../components/common/Icons';

export const getSocialLinks = (settings: any) => [
    { 
        id: 'whatsapp', 
        label: 'WhatsApp', 
        icon: WhatsAppIcon, 
        bg: 'bg-green-500', 
        url: settings?.contactWhatsappUrl || 'https://wa.me/201222995328' 
    },
    { 
        id: 'support', 
        label: 'الدعم الفني', 
        icon: QuestionMarkCircleIcon, 
        bg: 'bg-blue-600', 
        url: settings?.contactWhatsappUrl || 'https://wa.me/201222995328'
    },
    { 
        id: 'instagram', 
        label: 'Instagram', 
        icon: InstagramIcon, 
        bg: 'bg-pink-600', 
        url: settings?.contactInstagramUrl || '#' 
    },
    { 
        id: 'facebook', 
        label: 'Facebook', 
        icon: FacebookIcon, 
        bg: 'bg-blue-800', 
        url: settings?.contactFacebookUrl || '#' 
    },
];
