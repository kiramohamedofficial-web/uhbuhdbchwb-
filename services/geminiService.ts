
import { GoogleGenAI, Type } from "@google/genai";
import { Grade, QuizQuestion, Unit } from '../types';

// Per coding guidelines, the API key is sourced directly from process.env.API_KEY
// and is assumed to be pre-configured and valid.

export const formatBackupReport = async (rawData: any): Promise<string> => {
  if (!process.env.NEXT_PUBLIC_API_KEY) return "API Key Missing";

  const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_API_KEY });
  const prompt = `
    أنت خبير في إدارة البيانات والتقارير التعليمية.
    لديك البيانات التالية لطلاب منصة تعليمية بصيغة JSON.
    المهمة: قم بتحويل هذه البيانات إلى تقرير إداري "نصي" فائق الاحترافية باللغة العربية.
    
    البيانات: ${JSON.stringify(rawData)}

    التعليمات التنسيقية:
    1. استخدم الفواصل الزخرفية (مثل === أو ---) للفصل بين الأقسام.
    2. رتب التقرير حسب "الصف الدراسي".
    3. لكل طالب، اذكر ملخصاً لتقدمه (عدد الدروس المكتملة، متوسط درجاته).
    4. أضف رؤية تحليلية عامة في بداية التقرير حول مستوى التفاعل.
    5. استخدم رموز تعبيرية (Emojis) احترافية (مثل 📊, 🎓, 📱).
    6. اجعل التقرير يبدو كأنه صادر من مكتب إدارة تعليمي مرموق.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "فشل في تنسيق التقرير.";
  } catch (error) {
    console.error("Gemini Format Error:", error);
    return "حدث خطأ أثناء معالجة التقرير بالذكاء الاصطناعي.";
  }
};

export const generateReportSummary = async (stats: any): Promise<string> => {
  if (!process.env.NEXT_PUBLIC_API_KEY) return "API Key Missing";

  const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_API_KEY });
  const prompt = `
    أنت محلل بيانات استراتيجي لمنصة تعليمية إلكترونية.
    لديك الإحصائيات العامة التالية عن أداء المنصة:
    ${JSON.stringify(stats)}

    المطلوب:
    اكتب ملخصاً تنفيذياً احترافياً باللغة العربية (فقرة واحدة مركزة) يوضح الحالة العامة للمنصة.
    قم بتسليط الضوء على نسبة مشاركة الطلاب (الاشتراكات النشطة)، ومستوى التحصيل الأكاديمي (معدل الإكمال ومتوسط الدرجات).
    استخدم نبرة رسمية ومشجعة.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "لا يتوفر تحليل حالياً.";
  } catch (error) {
    console.error("Gemini Summary Error:", error);
    return "تعذر إنشاء التحليل الذكي بسبب خطأ في الاتصال.";
  }
};

/**
 * 🕵️‍♂️ محرك تحليل قاعدة البيانات الذكي
 * يقوم بمقارنة الهيكل الحالي بالتوثيق الرسمي
 */
export const analyzeDatabaseStructure = async (currentSchemaJson: string, expectedDocs: string): Promise<string> => {
  if (!process.env.NEXT_PUBLIC_API_KEY) return "API Key Missing";

  const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_API_KEY });

  const systemInstruction = `
    أنت خبير أول في قواعد البيانات (Senior DBA) ومحترف SQL.
    هدفك هو مقارنة "الهيكل الحالي" لقاعدة البيانات (بصيغة JSON) مع "الهيكل المتوقع" (المكتوب في وثائق المشروع).
    يجب أن تكون إجابتك دقيقة جداً وموجهة لإصلاح الأعطال.
  `;

  const prompt = `
    الوثائق الرسمية للهيكل المتوقع (الحقيقة):
    """
    ${expectedDocs.substring(0, 15000)} 
    """

    الهيكل الفعلي المستخرج حالياً من قاعدة بيانات Supabase (JSON):
    """
    ${currentSchemaJson}
    """

    **المهمة المطلوبة:**
    1. **تحليل الفروقات:** حدد بالضبط الجداول المفقودة والأعمدة الناقصة داخل الجداول الموجودة.
    2. **كشف الفائض:** حدد الجداول أو الأعمدة الموجودة في قاعدة البيانات ولكنها غير مذكورة في الوثائق (بيانات مهملة).
    3. **توليد أكواد الإصلاح:** قدم أوامر SQL (CREATE/ALTER) الدقيقة لجعل الهيكل الحالي يطابق تماماً الهيكل المتوقع.
    4. **تحذير الأمان:** إذا كان الجدول موجوداً ولكن بأعمدة مختلفة، اقترح ALTER ولا تقترح DROP إلا إذا كان الجدول فائضاً تماماً.

    **تنسيق المخرجات:**
    اجعل الإجابة باللغة العربية، منسقة بـ Markdown:
    - قسم 1: 🚨 **النواقص والعيوب الحرجة**
    - قسم 2: 🛠️ **أوامر الإصلاح الفوري (SQL)** (ضع الكود في بلوك برمجي)
    - قسم 3: 🧹 **البيانات الفائضة وغير المستخدمة**
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // استخدام Pro لقدرات الاستنتاج العالية
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.1, // درجة حرارة منخفضة لضمان الدقة التقنية
      }
    });
    return response.text || "لم يتمكن النظام من تحليل البيانات.";
  } catch (error) {
    console.error("Gemini DB Analysis Error:", error);
    return "حدث خطأ أثناء الاتصال بـ Gemini للتحليل الذكي.";
  }
};

export const getAIExplanation = async (
  subject: string,
  question: string,
  grade: string,
  lessonContext?: { title: string; description: string }
): Promise<string> => {
  if (!process.env.NEXT_PUBLIC_API_KEY) {
    const userFriendlyMessage = "عذرًا، خدمة المساعد الذكي غير متاحة حاليًا بسبب مشكلة في الإعدادات. يرجى التواصل مع مسؤول المنصة.";
    return userFriendlyMessage;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_API_KEY });

  // Construct a strong context block
  let contextInstruction = "";
  if (lessonContext) {
    contextInstruction = `
      [المصدر الأساسي للإجابة (Ground Truth)]:
      - عنوان الدرس: "${lessonContext.title}"
      - وصف الفيديو/المحتوى:
      """
      ${lessonContext.description || 'لا يوجد وصف متاح'}
      """
      
      ⚠️ قواعد السياق الصارمة:
      1. إجابتك يجب أن تعتمد **بشكل أساسي وحصري** على المعلومات الموجودة في "وصف الفيديو" أعلاه.
      2. إذا كان "وصف الفيديو" يتحدث عن موضوع يختلف عن اسم المادة "${subject}"، **تجاهل اسم المادة** واعتمد على الوصف فقط. (مثلاً: إذا كان الوصف إنجليزي والمادة أحياء، أجب من درس الإنجليزي).
      3. إذا سأل الطالب عن تلخيص، لخص ما ورد في الوصف فقط.
      `;
  }

  const prompt = `
    السياق العام: طالب في مرحلة "${grade}".
    المادة المسجلة: "${subject}".
    ${contextInstruction}

    سؤال الطالب: "${question}"
  `;

  // System Instruction for tone and style
  const systemInstruction = `
    أنت محرك إجابة تعليمي مباشر جداً.
    القوانين الصارمة للرد:
    1. **ممنوع تماماً** استخدام عبارات الترحيب (أهلاً، مرحباً، يا بطل، عزيزي).
    2. **ممنوع تماماً** استخدام المقدمات (بناءً على الفيديو، إليك الشرح، الجواب هو).
    3. ادخل في صلب المعلومة فوراً من أول كلمة.
    4. كن موجزاً، دقيقاً، واستخدم نقاطاً (Bullet Points) إذا كان الشرح طويلاً.
    5. التزم بحدود المعلومات المتوفرة في السياق ولا تخرج عنها إلا للضرورة القصوى للتوضيح.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3, // Lower temperature for more factual/direct responses
      }
    });
    return response.text || "عذراً، لم أتمكن من توليد إجابة في الوقت الحالي.";
  } catch (error: unknown) {
    return "عذراً، واجهت مشكلة في الاتصال. يرجى المحاولة مرة أخرى لاحقاً.";
  }
};

// --- Helper to determine context instructions based on Grade ---
const getExamStyleInstructions = (grade: string): string => {
  const isSecondary = grade.includes('ثانوي') || grade.includes('Secondary');

  if (isSecondary) {
    return `
            - أنت تضع امتحان لطلاب **المرحلة الثانوية العامة (نظام التابلت المصري الجديد)**.
            - **ممنوع منعاً باتاً** الأسئلة المباشرة التي تعتمد على الحفظ والتلقين.
            - الأسئلة يجب أن تقيس مهارات التفكير العليا (الفهم، التطبيق، التحليل، التركيب).
            - استخدم صيغ مثل: "استنتج"، "ما دلالة"، "ماذا يحدث لو"، "قارن من حيث"، "اختر أدق إجابة".
            - الخيارات (الاختيارات) يجب أن تكون دقيقة ومتقاربة لتختبر الفهم العميق.
        `;
  } else {
    return `
            - أنت تضع امتحان لطلاب **المرحلة الإعدادية**.
            - الأسئلة يجب أن تكون متوازنة بين المعرفة المباشرة والفهم المتوسط.
            - اللغة يجب أن تكون واضحة ومباشرة.
        `;
  }
};

export const generatePracticeTest = async (
  unit: string,
  topic: string,
  grade: string,
  difficulty: 'سهل' | 'متوسط' | 'صعب',
  numQuestions: number,
  questionTypes: string[]
): Promise<QuizQuestion[]> => {
  if (!process.env.NEXT_PUBLIC_API_KEY) {
    throw new Error("مفتاح API غير متوفر.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_API_KEY });

  const styleInstructions = getExamStyleInstructions(grade);

  const prompt = `
    أنت موجه أول مادة دراسية.
    المهمة: إنشاء اختبار إلكتروني.
    
    التفاصيل:
    - الصف: ${grade}
    - الوحدة: ${unit}
    - الموضوع: ${topic}
    - الصعوبة: ${difficulty}
    - العدد: ${numQuestions}
    
    المعايير:
    ${styleInstructions}
    
    المخرجات: JSON فقط. 4 خيارات لكل سؤال.
  `;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            questionText: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswerIndex: { type: Type.INTEGER },
            rationale: { type: Type.STRING }
          },
          required: ['questionText', 'options', 'correctAnswerIndex', 'rationale']
        }
      }
    },
    required: ['questions']
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: difficulty === 'صعب' ? 0.9 : 0.7,
      },
    });
    const jsonResponse = JSON.parse(response.text || '{"questions": []}');
    return jsonResponse.questions || [];
  } catch (error) {
    console.error("Quiz Gen Error:", error);
    throw new Error("فشل توليد الاختبار.");
  }
};

export const generateQuiz = async (
  topic: string,
  grade: string,
  difficulty: 'سهل' | 'متوسط' | 'صعب',
  numQuestions: number
): Promise<QuizQuestion[]> => {
  return generatePracticeTest("عام", topic, grade, difficulty, numQuestions, ['MCQ']);
};

export const generateVideoQuestions = async (
  description: string,
  grade: string,
  lessonTitle: string
): Promise<QuizQuestion[]> => {
  if (!process.env.NEXT_PUBLIC_API_KEY) throw new Error("مفتاح API غير متوفر.");
  const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_API_KEY });

  const styleInstructions = getExamStyleInstructions(grade);

  const prompt = `
    أنت خبير تقييم.
    المهمة: إنشاء "أسئلة تخطي" (Gatekeeper Questions).
    
    المدخلات:
    - الدرس: ${lessonTitle}
    - الصف: ${grade}
    - محتوى الفيديو: "${description}"
    
    المعايير:
    - الأسئلة مبنية *حصرياً* على الوصف المقدم.
    - تقيس التركيز والفهم.
    ${styleInstructions}
    
    المطلوب: 5 أسئلة MCQ JSON.
  `;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            questionText: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswerIndex: { type: Type.INTEGER },
            rationale: { type: Type.STRING }
          },
          required: ['questionText', 'options', 'correctAnswerIndex']
        }
      }
    },
    required: ['questions']
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });
    const jsonResponse = JSON.parse(response.text || '{"questions": []}');
    return (jsonResponse.questions || []).slice(0, 5);
  } catch (error) {
    throw new Error("فشل توليد أسئلة الفيديو.");
  }
};

export type ChatMode = 'normal' | 'fast' | 'thinking';

export const getChatbotResponseStream = async (
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  newMessage: string,
  mode: ChatMode,
  customSystemInstruction?: string // New optional parameter
) => {
  if (!process.env.NEXT_PUBLIC_API_KEY) throw new Error("مفتاح API غير متوفر.");
  const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_API_KEY });
  const modelMap: Record<ChatMode, string> = {
    normal: 'gemini-3-flash-preview',
    fast: 'gemini-flash-lite-latest',
    thinking: 'gemini-3-pro-preview',
  };

  const baseInstruction = `أنت مساعد دراسي مباشر.
    قوانين الرد:
    1. ممنوع التحية أو المقدمات (مثل: أهلاً، تفضل، الإجابة هي).
    2. ادخل في صلب الموضوع فوراً.
    3. اجعل ردودك قصيرة ومركزة جداً.
  `;

  // Combine base instructions with custom subject-specific ones
  const finalSystemInstruction = customSystemInstruction
    ? `${baseInstruction}\n\nالدور الحالي: ${customSystemInstruction}`
    : baseInstruction;

  const config = {
    systemInstruction: finalSystemInstruction
  };

  const contents = [...history, { role: 'user', parts: [{ text: newMessage }] }];

  try {
    return await ai.models.generateContentStream({
      model: modelMap[mode],
      contents,
      config,
    });
  } catch (error: unknown) {
    throw new Error("حدث خطأ أثناء التواصل مع المساعد الذكي.");
  }
};

export interface StudyPlanInputs {
  gradeName: string;
  dailyStudyHours: number;
  dayStartTime: string;
  dayEndTime: string;
  subjects: { name: string; weeklyHours: number; priority: 'مرتفعة' | 'عادية'; }[];
  busyTimes: Record<string, string[]>;
}

export interface StudyScheduleItem {
  day: string;
  startTime: string;
  endTime: string;
  subject: string;
}

export const generateStudyPlan = async (inputs: StudyPlanInputs): Promise<StudyScheduleItem[]> => {
  if (!process.env.NEXT_PUBLIC_API_KEY) throw new Error("مفتاح API غير متوفر.");
  const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_API_KEY });

  const prompt = `
        أنشئ جدول دراسي أسبوعي (JSON).
        البيانات:
        - الصف: ${inputs.gradeName}
        - ساعات يومية: ${inputs.dailyStudyHours}
        - الوقت: ${inputs.dayStartTime} - ${inputs.dayEndTime}
        - المواد: ${JSON.stringify(inputs.subjects)}
        - مشغول: ${JSON.stringify(inputs.busyTimes)}

        القواعد:
        1. وزع المواد حسب الأولوية.
        2. تجنب المواد الثقيلة متتالية.
        3. احترم أوقات الانشغال.
    `;

  const scheduleSchema = {
    type: Type.OBJECT,
    properties: {
      schedule: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            day: { type: Type.STRING },
            startTime: { type: Type.STRING },
            endTime: { type: Type.STRING },
            subject: { type: Type.STRING },
          },
          required: ['day', 'startTime', 'endTime', 'subject']
        }
      }
    },
    required: ['schedule']
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: scheduleSchema,
        temperature: 0.2,
      },
    });
    const jsonResponse = JSON.parse(response.text || '{"schedule": []}');
    return jsonResponse.schedule || [];
  } catch (error) {
    throw new Error("فشل توليد الخطة.");
  }
};
