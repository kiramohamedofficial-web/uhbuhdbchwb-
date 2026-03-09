## 📋 تعليمات تغيير كلمة المرور

---

### 1️⃣ المدير يغير كلمة مرور طالب/مشرف

```typescript
import { supabase } from "@/integrations/supabase/client";

// دالة تغيير كلمة المرور بواسطة المدير (RPC)
const adminChangePassword = async (userId: string, newPassword: string) => {
  try {
    const { data, error } = await supabase.rpc('admin_update_password', {
      user_id: userId,
      new_password: newPassword
    });

    if (error) throw error;

    console.log("✅ تم تغيير كلمة المرور بنجاح");
    return { success: true };
  } catch (error) {
    console.error("❌ خطأ:", error.message);
    return { success: false, error: error.message };
  }
};

// مثال الاستخدام
await adminChangePassword(
  "abc123-user-uuid-here",  // معرف المستخدم
  "NewPassword123"          // كلمة المرور الجديدة
);
```

---

### 2️⃣ الطالب يغير كلمة مروره بنفسه

```typescript
import { supabase } from "@/integrations/supabase/client";

// دالة تغيير كلمة المرور للمستخدم الحالي
const changeMyPassword = async (newPassword: string) => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;

    console.log("✅ تم تغيير كلمة المرور بنجاح");
    return { success: true };
  } catch (error) {
    console.error("❌ خطأ:", error.message);
    return { success: false, error: error.message };
  }
};

// مثال الاستخدام
await changeMyPassword("MyNewPassword123");
```

---

### 3️⃣ مكون React كامل للطالب

```tsx
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const ChangePasswordForm = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("كلمات المرور غير متطابقة");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    setLoading(false);

    if (error) {
      toast.error("فشل تغيير كلمة المرور: " + error.message);
    } else {
      toast.success("تم تغيير كلمة المرور بنجاح");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="password"
        placeholder="كلمة المرور الجديدة"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        required
      />
      <Input
        type="password"
        placeholder="تأكيد كلمة المرور"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
      />
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "جاري التغيير..." : "تغيير كلمة المرور"}
      </Button>
    </form>
  );
};

export default ChangePasswordForm;
```

---

### 4️⃣ مكون React للمدير

```tsx
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface AdminChangePasswordProps {
  userId: string;
  userName: string;
}

const AdminChangePassword = ({ userId, userName }: AdminChangePasswordProps) => {
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setLoading(true);

    // استخدام RPC بدلاً من Edge Function
    const { data, error } = await supabase.rpc('admin_update_password', {
      user_id: userId,
      new_password: newPassword
    });

    setLoading(false);

    if (error) {
      toast.error("فشل تغيير كلمة المرور: " + error.message);
    } else {
      toast.success(`تم تغيير كلمة مرور ${userName} بنجاح`);
      setNewPassword("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg">
      <h3 className="font-bold">تغيير كلمة مرور: {userName}</h3>
      <Input
        type="password"
        placeholder="كلمة المرور الجديدة"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        required
      />
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "جاري التغيير..." : "تغيير كلمة المرور"}
      </Button>
    </form>
  );
};

export default AdminChangePassword;
```

---

### 5️⃣ إعداد قاعدة البيانات (SQL)

يجب تشغيل هذا الكود في Supabase SQL Editor لإنشاء دالة التحديث:

```sql
-- دالة تغيير كلمة المرور للمدير (RPC)
CREATE OR REPLACE FUNCTION admin_update_password(user_id uuid, new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = user_id;
END;
$$;
```

---

### 📌 ملخص

| السيناريو | الطريقة |
|-----------|---------|
| **الطالب يغير لنفسه** | `supabase.auth.updateUser({ password })` |
| **المدير يغير للآخرين** | `supabase.rpc('admin_update_password')` |
