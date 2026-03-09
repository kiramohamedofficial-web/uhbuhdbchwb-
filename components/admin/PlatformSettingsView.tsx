
import React, { useState, useEffect, useCallback } from 'react';
import { User, PlatformSettings, ToastType } from '../../types';
import { getPlatformSettings, updatePlatformSettings } from '../../services/storageService';
import { logAdminAction } from '../../services/auditService';
import { useToast } from '../../useToast';
import { 
    TemplateIcon, 
    SparklesIcon, 
    PhotoIcon, 
    UsersIcon,
    InstagramIcon,
    WhatsAppIcon,
    FacebookIcon,
    YoutubeIcon,
    PhoneIcon,
    PlusIcon,
    MegaphoneIcon,
    TrashIcon,
    CheckCircleIcon
} from '../common/Icons';
import ImageUpload from '../common/ImageUpload';
import Loader from '../common/Loader';
import AdControl from './AdControl';

const SettingCard: React.FC<{ children: React.ReactNode; noPadding?: boolean }> = ({ children, noPadding }) => (
    <div className={`bg-[var(--bg-secondary)] ${noPadding ? '' : 'p-6 md:p-10'} rounded-[2.5rem] shadow-sm border border-[var(--border-primary)] transition-all duration-500 hover:shadow-xl animate-fade-in`}>
        {children}
    </div>
);

const PremiumInput: React.FC<{ label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; icon?: React.FC<any> }> = ({ label, name, value, onChange, placeholder, icon: Icon }) => (
    <div className="group space-y-2">
        <label className="block text-sm font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] group-focus-within:text-indigo-500 transition-colors mr-1 flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4"/>} {label}
        </label>
        <input 
            type="text" 
            name={name} 
            value={value} 
            onChange={onChange} 
            placeholder={placeholder}
            className="w-full px-6 py-4 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-2xl font-bold text-[var(--text-primary)] focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
        />
    </div>
);

const PremiumTextarea: React.FC<{ label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; rows?: number }> = ({ label, name, value, onChange, rows = 3 }) => (
    <div className="group space-y-2">
        <label className="block text-sm font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] group-focus-within:text-indigo-500 transition-colors mr-1">{label}</label>
        <textarea 
            name={name} 
            value={value} 
            onChange={onChange} 
            rows={rows}
            className="w-full px-6 py-4 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-2xl font-bold text-[var(--text-primary)] focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none resize-none leading-relaxed"
        />
    </div>
);

const SidebarItem: React.FC<{ id: string; label: string; icon: React.FC<any>; active: boolean; onClick: () => void }> = ({ id, label, icon: Icon, active, onClick }) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 flex-shrink-0 ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'}`}
    >
        <Icon className={`w-5 h-5 ${active ? 'text-white' : ''}`} />
        <span className="font-black text-sm whitespace-nowrap">{label}</span>
    </button>
);

const PlatformSettingsView: React.FC<{ user: User }> = ({ user }) => {
    const [settings, setSettings] = useState<PlatformSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('marketing');
    const [isSaving, setIsSaving] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        getPlatformSettings().then(s => {
            setSettings(s);
            setIsLoading(false);
        });
    }, []);

    const handleChange = useCallback((section: string, key: string, value: any) => {
        setSettings(prev => {
            if (!prev) return null;
            if (section === 'root') return { ...prev, [key]: value };
            return prev;
        });
    }, []);

    const handleAddGalleryImage = () => {
        setSettings(prev => prev ? { ...prev, galleryImages: [...(prev.galleryImages || []), ''] } : null);
    };

    const handleRemoveGalleryImage = (index: number) => {
         setSettings(prev => {
             if (!prev) return null;
             const newGallery = [...(prev.galleryImages || [])];
             newGallery.splice(index, 1);
             return { ...prev, galleryImages: newGallery };
         });
    };

    const handleGalleryImageChange = (index: number, value: string) => {
         setSettings(prev => {
             if (!prev) return null;
             const newGallery = [...(prev.galleryImages || [])];
             newGallery[index] = value;
             return { ...prev, galleryImages: newGallery };
         });
    };

    const handleSave = async () => {
        if (!settings) return;
        setIsSaving(true);
        try {
            const { error } = await updatePlatformSettings(settings);
            if (error) {
                console.error("Save Settings Error:", error);
                addToast(`فشل حفظ التعديلات: ${error.message}`, ToastType.ERROR);
            } else {
                await logAdminAction(user.id, user.name, 'تحديث إعدادات المنصة', 'قام المدير بتحديث إعدادات الواجهة والبيانات العامة للمنصة.');
                addToast('تم تحديث لوحة التحكم والواجهة بنجاح.', ToastType.SUCCESS);
            }
        } catch (e: any) {
            addToast(`خطأ غير متوقع: ${e.message}`, ToastType.ERROR);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading || !settings) return <div className="flex justify-center items-center h-96"><Loader /></div>;

    const tabs = [
        { id: 'marketing', label: 'شريط الإعلانات', icon: MegaphoneIcon },
        { id: 'general', label: 'الواجهة الرئيسية', icon: TemplateIcon },
        { id: 'contact', label: 'بيانات التواصل', icon: PhoneIcon },
        { id: 'social', label: 'منصات التواصل', icon: UsersIcon },
        { id: 'gallery', label: 'معرض الصور', icon: PhotoIcon },
        { id: 'branding', label: 'الهوية البصرية', icon: SparklesIcon },
    ];

    return (
        <div className="flex flex-col h-full gap-8 max-w-6xl mx-auto pb-24 px-2">
             <div className="text-center md:text-right mb-6">
                <h1 className="text-3xl font-black text-[var(--text-primary)]">إدارة المنصة (King's Control)</h1>
                <p className="text-[var(--text-secondary)] font-bold">التحكم الكامل في واجهة الترحيب، الإعلانات، والبيانات.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-10">
                {/* Responsive Sidebar */}
                <aside className="lg:w-64 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible no-scrollbar pb-2 lg:pb-0 sticky top-0 z-20 h-fit bg-[var(--bg-primary)] pt-1">
                    {tabs.map(tab => (
                        <SidebarItem key={tab.id} {...tab} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
                    ))}
                </aside>

                <main className="flex-1 space-y-8">
                    
                    {activeTab === 'marketing' && (
                        <SettingCard>
                            <AdControl />
                        </SettingCard>
                    )}

                    {activeTab === 'general' && (
                        <SettingCard>
                            <h2 className="text-2xl font-black mb-8 border-r-4 border-indigo-600 pr-4">النصوص الترحيبية</h2>
                            <div className="space-y-6">
                                <PremiumInput label="اسم المنصة" name="platformName" value={settings.platformName} onChange={e => handleChange('root', 'platformName', e.target.value)} />
                                <PremiumInput label="العنوان العريض (Hero Title)" name="heroTitle" value={settings.heroTitle} onChange={e => handleChange('root', 'heroTitle', e.target.value)} />
                                <PremiumTextarea label="النص التعريفي (Subtitle)" name="heroSubtitle" value={settings.heroSubtitle} onChange={e => handleChange('root', 'heroSubtitle', e.target.value)} rows={4} />
                                <PremiumInput label="نص زر البدء" name="heroButtonText" value={settings.heroButtonText} onChange={e => handleChange('root', 'heroButtonText', e.target.value)} />
                            </div>
                        </SettingCard>
                    )}

                    {activeTab === 'contact' && (
                        <SettingCard>
                             <h2 className="text-2xl font-black mb-8 border-r-4 border-emerald-500 pr-4">معلومات الاتصال</h2>
                             <div className="space-y-6">
                                <PremiumInput label="رقم الهاتف الرئيسي" name="contactPhone" value={settings.contactPhone} onChange={e => handleChange('root', 'contactPhone', e.target.value)} icon={PhoneIcon} />
                                <PremiumTextarea label="وصف التذييل (Footer)" name="footerDescription" value={settings.footerDescription} onChange={e => handleChange('root', 'footerDescription', e.target.value)} />
                             </div>
                        </SettingCard>
                    )}

                    {activeTab === 'social' && (
                        <SettingCard>
                             <h2 className="text-2xl font-black mb-8 border-r-4 border-blue-500 pr-4">روابط السوشيال ميديا</h2>
                             <div className="space-y-6">
                                <PremiumInput label="رابط واتساب" name="contactWhatsappUrl" value={settings.contactWhatsappUrl || ''} onChange={e => handleChange('root', 'contactWhatsappUrl', e.target.value)} icon={WhatsAppIcon} placeholder="https://wa.me/..." />
                                <PremiumInput label="رابط فيسبوك" name="contactFacebookUrl" value={settings.contactFacebookUrl} onChange={e => handleChange('root', 'contactFacebookUrl', e.target.value)} icon={FacebookIcon} placeholder="https://facebook.com/..." />
                                <PremiumInput label="رابط انستجرام" name="contactInstagramUrl" value={settings.contactInstagramUrl || ''} onChange={e => handleChange('root', 'contactInstagramUrl', e.target.value)} icon={InstagramIcon} placeholder="https://instagram.com/..." />
                                <PremiumInput label="رابط يوتيوب" name="contactYoutubeUrl" value={settings.contactYoutubeUrl} onChange={e => handleChange('root', 'contactYoutubeUrl', e.target.value)} icon={YoutubeIcon} placeholder="https://youtube.com/..." />
                             </div>
                        </SettingCard>
                    )}

                    {activeTab === 'gallery' && (
                        <SettingCard>
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-black border-r-4 border-purple-500 pr-4">معرض الصور (السفلي)</h2>
                                <button onClick={handleAddGalleryImage} className="bg-purple-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-purple-700 transition-colors">
                                    <PlusIcon className="w-5 h-5"/> إضافة صورة
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-6">
                                {(settings.galleryImages || []).map((imgUrl, idx) => (
                                    <div key={idx} className="flex gap-4 items-start bg-[var(--bg-tertiary)] p-4 rounded-2xl border border-[var(--border-primary)] animate-slide-up">
                                        <div className="w-24 h-24 flex-shrink-0 bg-[var(--bg-secondary)] rounded-xl overflow-hidden border border-[var(--border-primary)] relative">
                                            {imgUrl ? <img src={imgUrl} className="w-full h-full object-cover" /> : <PhotoIcon className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20"/>}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <label className="text-sm font-black uppercase text-[var(--text-secondary)]">رابط الصورة {idx + 1}</label>
                                            <ImageUpload label="" value={imgUrl} onChange={(v) => handleGalleryImageChange(idx, v)} />
                                        </div>
                                        <button onClick={() => handleRemoveGalleryImage(idx)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-colors mt-6">
                                            <TrashIcon className="w-5 h-5"/>
                                        </button>
                                    </div>
                                ))}
                                {(!settings.galleryImages || settings.galleryImages.length === 0) && (
                                    <div className="text-center py-10 opacity-50 font-bold">لا توجد صور في المعرض. أضف صوراً لتظهر في الشريط المتحرك أسفل الصفحة الرئيسية.</div>
                                )}
                            </div>
                        </SettingCard>
                    )}

                    {activeTab === 'branding' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <SettingCard>
                                <h3 className="font-black text-sm mb-6 text-[var(--text-secondary)] uppercase">صورة الغلاف (Hero Image)</h3>
                                <div className="aspect-video bg-[var(--bg-tertiary)] rounded-3xl mb-6 overflow-hidden border-2 border-dashed border-[var(--border-primary)] relative">
                                    {settings.heroImageUrl ? <img src={settings.heroImageUrl} className="w-full h-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center opacity-20"><PhotoIcon className="w-12 h-12"/></div>}
                                </div>
                                <ImageUpload label="" value={settings.heroImageUrl || ''} onChange={v => handleChange('root', 'heroImageUrl', v)} />
                            </SettingCard>
                            <SettingCard>
                                <h3 className="font-black text-sm mb-6 text-[var(--text-secondary)] uppercase">صورة المدرس الرئيسية</h3>
                                <div className="w-48 h-48 mx-auto bg-[var(--bg-tertiary)] rounded-full mb-6 overflow-hidden border-2 border-dashed border-[var(--border-primary)] relative">
                                    {settings.teacherImageUrl ? <img src={settings.teacherImageUrl} className="w-full h-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center opacity-20"><UsersIcon className="w-12 h-12"/></div>}
                                </div>
                                <ImageUpload label="" value={settings.teacherImageUrl || ''} onChange={v => handleChange('root', 'teacherImageUrl', v)} />
                            </SettingCard>
                        </div>
                    )}
                </main>
            </div>
            
            {activeTab !== 'marketing' && (
                 <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-12 py-4 rounded-3xl font-black shadow-2xl shadow-indigo-500/40 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3 disabled:opacity-50"
                    >
                        {isSaving ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : <CheckCircleIcon className="w-6 h-6" />}
                        <span>حفظ التغييرات</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default PlatformSettingsView;
