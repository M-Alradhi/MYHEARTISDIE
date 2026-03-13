
"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Bot, Send, X, Minimize2, Maximize2, Sparkles, Trash2 } from "lucide-react"
import { useLanguage } from "@/lib/contexts/language-context"

// --- Knowledge Base ---
export type KBEntry = {
  keywords: string[]
  answer: string
}

export type KnowledgeBase = {
  [language: string]: {
    [topic: string]: KBEntry
  }
}

export const knowledgeBase: KnowledgeBase = {
  ar: {
    supervisors_cs: {
      keywords: ["مشرفين cs", "علوم الحاسب", "دكاترة cs", "اساتذة cs", "مشرف cs"],
      answer: `🔹 قسم علوم الحاسب (CS)

- د. فيصل عبدالحميد القائد (رئيس القسم)
  📧 falqaed@uob.edu.bh | 🏢 مكتب: 067 | 📞 7666

- د. فوزي عبدالعزيز البلوشي
  📧 falblooshi@uob.edu.bh | 🏢 مكتب: 2068 | 📞 8376

- د. نبيل محمود حويحي
  📧 nhewahi@uob.edu.bh | 🏢 مكتب: 2064 | 📞 7643

- Dr. Amal Saleh Ghanim
  📧 aghanim@uob.edu.bh | 🏢 مكتب: 1072

- Dr. Hadeel AlObaidy
  📧 halobaidy@uob.edu.bh | 🏢 مكتب: 2073

- Mohammed Mazin
  📧 mmazin@uob.edu.bh | 🏢 مكتب: 2069`,
    },
    supervisors_is: {
      keywords: ["مشرفين is", "نظم المعلومات", "دكاترة is", "اساتذة is", "مشرف is"],
      answer: `🔹 قسم نظم المعلومات (IS)

- د. ايهاب جمعة عدوان
  📧 eadwan@uob.edu.bh | 🏢 مكتب: 2017 | 📞 7795

- د. جيهان الشاذلي كعبي
  📧 jkaapi@uob.edu.bh | 🏢 مكتب: 2019 | 📞 7610

- د. فيصل عيسى حفيظ حماد
  📧 fhammad@uob.edu.bh | 🏢 مكتب: 2035 | 📞 7625

- Dr. YAQOOB SALMAN ALSLAIS
  📧 ysalslais@uob.edu.bh | 🏢 مكتب: 2036

- Mazen Mohammed Ali
  📧 mali@uob.edu.bh | 🏢 مكتب: 2018

- Dr. AMAL MOHAMED ALRAYES
  📧 aalrayes@uob.edu.bh | 🏢 مكتب: 1026`,
    },
    supervisors_ce: {
      keywords: ["مشرفين ce", "هندسة الحاسب", "دكاترة ce", "اساتذة ce", "مشرف ce"],
      answer: `🔹 قسم هندسة الحاسب (CE)

- د. إبراهيم عبدالرحمن جناحي
  📧 eabdulrahman@uob.edu.bh | 🏢 مكتب: 1097 | 📞 7708

- د. وائل محمد المدني
  📧 iiict2018@uob.edu.bh | 🏢 مكتب: 2109 | 📞 7678

- د. عائشة محمد إبراهيم
  📧 amebrahim@uob.edu.bh | 🏢 مكتب: 1112 | 📞 7794

- Dr. AMAL JILNAR ABU HASSAN
  📧 aabuhassan@uob.edu.bh | 🏢 مكتب: 2094

- Mohamed A. Almeer
  📧 malmeer@uob.edu.bh | 🏢 مكتب: 2116

- Dr. Hessa Jassim Al-Junaid
  📧 haljunaid@uob.edu.bh | 🏢 مكتب: 1114`,
    },
    all_supervisors: {
      keywords: ["جميع المشرفين", "كل المشرفين"],
      answer: `🔹 CS / IS / CE\nاكتب اسم القسم للحصول على التفاصيل.`,
    },

    template_all: {
      keywords: ["القوالب المتاحة", "ايش القوالب", "وش القوالب", "كم قالب", "انواع القوالب", "قوالب التخرج", "قوالب المشاريع", "اريد قالب", "ابي قالب", "وين القوالب"],
      answer: `📚 القوالب المتاحة — جامعة البحرين

اكتب اسم القالب للحصول على محتواه الكامل:

━━━━━━━━━━━━━━━━━━━━━━━━

🔵 CS — علوم الحاسب
• "قالب CS System" — تقرير نظام CS/IS
• "قالب CS Research" — تقرير بحث CS

🟢 CY — أمن المعلومات
• "قالب CY System" — تقرير نظام Cybersecurity
• "قالب CY Research" — تقرير بحث Cybersecurity

🟠 CE — هندسة الحاسب
• "قالب CE" — تقرير نظام Computer Engineering

━━━━━━━━━━━━━━━━━━━━━━━━

💡 غير متأكد؟ أخبرني تخصصك ونوع مشروعك (نظام أو بحث) وسأرشدك للقالب المناسب.`,
    },

    template_ce: {
      keywords: ["قالب ce", "template ce", "ce template", "تمبلت ce", "ce تمبلت", "قالب هندسة الحاسب", "قالب computer engineering", "ce report template", "هندسة الحاسب قالب", "ابي قالب ce", "اريد قالب ce"],
      answer: `📄 قالب تقرير هندسة الحاسب (CE)
🏛️ جامعة البحرين | كلية تقنية المعلومات | قسم هندسة الحاسب
📋 ITCE 499 — Senior Project

━━━━━━━━━━━━━━━━━━━━━━━━
صفحة الغلاف
━━━━━━━━━━━━━━━━━━━━━━━━
• اسم المشروع
• أسماء الطلاب وأرقامهم الجامعية
• اسم المشرف
• السنة الأكاديمية والفصل الدراسي
• تاريخ التسليم

━━━━━━━━━━━━━━━━━━━━━━━━
Abstract
━━━━━━━━━━━━━━━━━━━━━━━━
ملخص 50-150 كلمة. يشمل: تعريف المشروع، المشكلة، ملخص التنفيذ، النتائج.
الجملة الأولى هي الأهم — اجعلها تصف المشروع بوضوح.

━━━━━━━━━━━━━━━━━━━━━━━━
Acknowledgments
━━━━━━━━━━━━━━━━━━━━━━━━
شكر وتقدير مختصر للمشرف والمساعدين.

━━━━━━━━━━━━━━━━━━━━━━━━
جدول المحتويات
━━━━━━━━━━━━━━━━━━━━━━━━
Abstract .......................... ii
Acknowledgments .................. iii
List of Tables ..................... v
List of Figures .................... vi
Chapter 1  Introduction ............ 1
Chapter 2  Background & Literature Review .. 2
Chapter 3  System Design ........... 3
Chapter 4  System Implementation ... 4
Chapter 5  Testing and Results ...... 5
Chapter 6  Conclusion and Future Work . 6
References ......................... 7
Appendix A – CD Material ........... 8
Appendix B – Format Guideline ....... 9

━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 1: Introduction
━━━━━━━━━━━━━━━━━━━━━━━━
1.1 Problem Statement
   قدّم المشكلة مقسّمة إلى 2-3 مشاكل فرعية.

1.2 Project Objectives
   الأهداف + نطاق البحث + القيود.

1.3 Relevance / Significance
   أهمية المشروع وتأثيره.

1.4 Report Outline
   فقرة قصيرة توضح هيكل التقرير.

━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 2: Background and Literature Review
━━━━━━━━━━━━━━━━━━━━━━━━
خلفية علمية + مراجعة الأبحاث السابقة.
ناقش المصادر، وجهات نظرها، حججها، واستنتاجاتك.

━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 3: System Design
━━━━━━━━━━━━━━━━━━━━━━━━
التصميم الأساسي للنظام:
• تدفق النظام
• تصميم الأجهزة (Hardware Design)
• الخوارزميات البرمجية
• أي مخططات تقنية ذات صلة

━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 4: System Implementation
━━━━━━━━━━━━━━━━━━━━━━━━
• تفاصيل تنفيذ النموذج الأولي
• كيفية اختيار المكونات ودمجها
• مبررات قرارات التنفيذ (أجهزة، سحابة، إلخ)
• لا تضع معلومات مفصلة عن المكونات — ضع مرجعاً لداتا شيت

━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 5: Testing and Results
━━━━━━━━━━━━━━━━━━━━━━━━
• مراحل الاختبار والنتائج
• مقارنة مع أنظمة مشابهة
• نقاط القوة والضعف في النظام المقترح

━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 6: Conclusion and Future Work
━━━━━━━━━━━━━━━━━━━━━━━━
• ملخص ما تم تصميمه وتنفيذه واختباره
• النتائج الرئيسية وأهميتها
• قيود المشروع
• أفكار للعمل المستقبلي

━━━━━━━━━━━━━━━━━━━━━━━━
References — IEEE referencing style

━━━━━━━━━━━━━━━━━━━━━━━━
📐 إعدادات التنسيق
━━━━━━━━━━━━━━━━━━━━━━━━
• حجم الورق: A4 | Portrait
• هوامش: أعلى/أسفل 2.5cm | يسار 3cm | يمين 2cm
• الخط الأساسي: Times New Roman (TNR)
• النص العادي: TNR 11pt | تباعد 1.5
• عناوين الفصول: TNR 18pt Bold Center (صفحة جديدة)
• Heading 1: TNR 14pt Bold | Heading 2: TNR 13pt Bold | Heading 3: TNR 12pt Bold
• الترقيم: روماني للمقدمة | عربي من الفصل الأول`,
    },

    template_cs_system: {
      keywords: ["قالب cs system", "cs system template", "تمبلت cs system", "قالب نظام cs", "قالب نظام is", "cs is system", "قالب نظام علوم الحاسب", "قالب نظام نظم المعلومات", "ابي قالب cs", "اريد قالب cs", "ابي قالب is", "اريد قالب is"],
      answer: `📄 قالب تقرير النظام — CS / IS
🏛️ جامعة البحرين | كلية تقنية المعلومات
📋 ITXX 499 — Senior Project (CS أو IS)

━━━━━━━━━━━━━━━━━━━━━━━━
صفحة الغلاف
━━━━━━━━━━━━━━━━━━━━━━━━
• عنوان المشروع
• أسماء الطلاب وأرقامهم الجامعية
• اسم المشرف + المشرف المشارك (اختياري)
• السنة الأكاديمية والفصل الدراسي
• تاريخ التسليم

━━━━━━━━━━━━━━━━━━━━━━━━
Abstract — 50-150 كلمة
Acknowledgments — شكر مختصر
━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━
جدول المحتويات
━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 1  Introduction ............. 1
Chapter 2  Literature Review ........ 2
Chapter 3  Project Management ....... 3
Chapter 4  Requirement Collection & Analysis .. 4
Chapter 5  System Design ............ 6
Chapter 6  System Implementation & Testing .. 7
Chapter 7  Conclusion and Future Work . 8
References .......................... 9

━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 1: Introduction
━━━━━━━━━━━━━━━━━━━━━━━━
1.1 Problem Statement
1.2 Project Objectives
1.3 Relevance / Significance
1.4 Report Outline

━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 2: Literature Review
━━━━━━━━━━━━━━━━━━━━━━━━
راجع 3 أبحاث/أنظمة مشابهة على الأقل:
• ما هو البحث/النظام؟
• كيف يحل المشكلة؟
• نقاط القوة والضعف
• ماذا ستستفيد منه في مشروعك؟

━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 3: Project Management
━━━━━━━━━━━━━━━━━━━━━━━━
3.1 Process Model
   اختر SDLC (Agile / Waterfall) مع مبرر لاختيارك.

3.2 Risk Management
   جدول: الخطر | المستوى (low/med/high) | خطة التخفيف
   مثال: مغادرة مطور | High | كل عضو يكون نسخة احتياطية للآخر

3.3 Project Activities Plan
   Gantt Chart أسبوعي بـ Excel

━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 4: Requirement Collection and Analysis
━━━━━━━━━━━━━━━━━━━━━━━━
4.1 Requirement Elicitation
   طرق جمع المتطلبات (مقابلات، استبيانات)

4.2 System Requirements
   وظيفية (5+): ركّز على الوظائف الأساسية فقط
   مثال جيد: "البحث عن كتاب باستخدام فلاتر متعددة"
   مثال ضعيف: "تسجيل الدخول / تسجيل الخروج"
   غير وظيفية (5+): مع كيفية تطبيقها

4.3 Personas — وصف المستخدمين

4.4 System Models
   ↳ Traditional: DFD + Process Specification + ERD
   ↳ OO: UML Use Case + Sequence/Activity Diagrams + Class Diagram

━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 5: System Design
━━━━━━━━━━━━━━━━━━━━━━━━
• تصميم قاعدة البيانات (Database Schema)
• واجهات المستخدم — Wireframes للوظائف الأساسية
• المعمارية البرمجية (Software Architecture)
• UML Diagrams تفصيلية إذا اخترت OO Approach

━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 6: System Implementation and Testing
━━━━━━━━━━━━━━━━━━━━━━━━
• تفاصيل التنفيذ + الأدوات ولغات البرمجة
• لقطات شاشة من النظام مع شرح
• اختبارات الاستخدام (Usability Testing)
• مقارنة النتائج مع الأنظمة من Chapter 2

━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 7: Conclusion and Future Work
━━━━━━━━━━━━━━━━━━━━━━━━
ملخص الإنجازات + النتائج + القيود + أفكار مستقبلية.

━━━━━━━━━━━━━━━━━━━━━━━━
References — Harvard referencing style

━━━━━━━━━━━━━━━━━━━━━━━━
📐 إعدادات التنسيق
━━━━━━━━━━━━━━━━━━━━━━━━
• A4 Portrait | هوامش: أعلى/أسفل 2.5cm | يسار 3cm | يمين 2cm
• TNR 11pt تباعد 1.5 للنص العادي
• عناوين الفصول: TNR 18pt Bold Center (صفحة جديدة)
• Heading 1: TNR 14pt | Heading 2: TNR 13pt | Heading 3: TNR 12pt
• ترقيم روماني للمقدمة | عربي من الفصل الأول`,
    },

    template_cs_research: {
      keywords: ["قالب cs research", "cs research template", "تمبلت cs research", "قالب بحث cs", "قالب بحث علوم الحاسب", "ابي قالب بحث cs", "اريد قالب بحث cs", "cs research"],
      answer: `📄 قالب تقرير البحث — CS (Research)
🏛️ جامعة البحرين | كلية تقنية المعلومات | قسم علوم الحاسب
📋 ITCS 499 — Senior Project

━━━━━━━━━━━━━━━━━━━━━━━━
صفحة الغلاف
━━━━━━━━━━━━━━━━━━━━━━━━
• عنوان المشروع
• أسماء الطلاب وأرقامهم
• اسم المشرف
• السنة الأكاديمية والفصل

━━━━━━━━━━━━━━━━━━━━━━━━
Abstract — 50-150 كلمة
Acknowledgments — شكر مختصر
━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━
جدول المحتويات
━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 1  Introduction ............. 1
Chapter 2  Literature Review ........ 3
Chapter 3  Methodology .............. 4
Chapter 4  Implementation and Results .. 5
Chapter 5  Conclusion and Future Work .. 6
References .......................... 7

━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 1: Introduction
━━━━━━━━━━━━━━━━━━━━━━━━
1.1 Problem Statement
   المشكلة مدعومة بأدلة وأرقام ومراجع.

1.2 Project Objectives
   الأهداف + النطاق (الجمهور المستهدف، التأثير) + القيود.

1.3 Relevance / Significance
   مساهمات المشروع كنقاط — ما الجديد الذي ستحققه؟
   مثال:
   1. المشروع يستخدم خوارزمية X لتحسين دقة النتائج.
   2. المشروع يطبق تقنية Y لأول مرة في هذا السياق.

1.4 Research Methodology — ملخص قصير للمنهجية.
1.5 Scope and Limitations — نطاق البحث وحدوده.
1.6 Report Outline

━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 2: Literature Review
━━━━━━━━━━━━━━━━━━━━━━━━
راجع 3+ أبحاث:
• ملخص البحث
• كيف يحل المشكلة التي تعالجها؟
• نقاط القوة والضعف
• ما الذي ستستفيد منه في بحثك؟

━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 3: Methodology
━━━━━━━━━━━━━━━━━━━━━━━━
اشرح بالتفصيل ماذا فعلت وكيف فعلته.
• اكتب بصيغة المجهول (Passive Voice)
  مثال: "تم جمع البيانات من..." بدلاً من "جمعنا البيانات من..."
• أرفق مخططات وجداول
• استشهد بمراجع للأساليب المستخدمة
• لا تذكر النتائج هنا

━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 4: Implementation and Results
━━━━━━━━━━━━━━━━━━━━━━━━
• الأدوات ولغات البرمجة المستخدمة
• طريقة الاختبار وتوليد البيانات
• النتائج ومناقشتها
• مقارنة النتائج مع الأبحاث السابقة من Chapter 2
• إرفاق الأدلة في Appendices

━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 5: Conclusion and Future Work
━━━━━━━━━━━━━━━━━━━━━━━━
• إعادة صياغة السؤال البحثي
• ملخص النتائج الرئيسية وأهميتها
• الربط بسؤال البحث
• القيود + أفكار للبحث المستقبلي

━━━━━━━━━━━━━━━━━━━━━━━━
References — Harvard referencing style

━━━━━━━━━━━━━━━━━━━━━━━━
📐 إعدادات التنسيق
━━━━━━━━━━━━━━━━━━━━━━━━
• A4 Portrait | هوامش: أعلى/أسفل 2.5cm | يسار 3cm | يمين 2cm
• TNR 11pt تباعد 1.5 للنص العادي
• عناوين الفصول: TNR 18pt Bold Center
• Heading 1: TNR 14pt | Heading 2: TNR 13pt | Heading 3: TNR 12pt`,
    },

    template_cy_system: {
      keywords: ["قالب cy system", "cy system template", "تمبلت cy system", "قالب نظام cy", "قالب نظام سيبر", "قالب نظام امن المعلومات", "ابي قالب cy", "اريد قالب cy", "cyber system template", "cybersecurity system template"],
      answer: `📄 قالب تقرير النظام — Cybersecurity (CY)
🏛️ جامعة البحرين | كلية تقنية المعلومات | قسم نظم المعلومات
📋 B.Sc. In Cybersecurity | ITXX 499

━━━━━━━━━━━━━━━━━━━━━━━━
صفحة الغلاف
━━━━━━━━━━━━━━━━━━━━━━━━
• عنوان المشروع
• أسماء الطلاب وأرقامهم
• اسم المشرف + المشرف المشارك
• السنة الأكاديمية والفصل

━━━━━━━━━━━━━━━━━━━━━━━━
Abstract
━━━━━━━━━━━━━━━━━━━━━━━━
يشمل: تعريف المشروع، المشكلة، ملخص التنفيذ، نتائج الاختبار، قياسات الأداء.

Acknowledgments
━━━━━━━━━━━━━━━━━━━━━━━━
شكر المشرف والعائلة والمساعدين.

━━━━━━━━━━━━━━━━━━━━━━━━
جدول المحتويات
━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 1  Introduction ............. 1
Chapter 2  Literature Review ........ 2
Chapter 3  Project Management ....... 3
Chapter 4  Requirement Collection & Analysis .. 4
Chapter 5  System Design ............ 6
Chapter 6  System Implementation & Testing .. 7
Chapter 7  Conclusion and Future Work . 8
References .......................... 9

━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 1: Introduction
━━━━━━━━━━━━━━━━━━━━━━━━
1.1 Problem Statement — مدعوم بأدلة وأرقام من أبحاث أو أخبار
1.2 Project Objectives — النطاق + الجمهور المستهدف + التأثير + القيود
1.3 Relevance/Significance — مساهمات المشروع كنقاط مرقّمة
1.4 Report Outline

━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 2: Literature Review
━━━━━━━━━━━━━━━━━━━━━━━━
راجع 3+ أبحاث/أنظمة مشابهة:
• ملخص + الوظيفة الأساسية + القوة والضعف
• ختم بخلاصة: ما الجيد، ما الضعيف، ما ستستفيده

━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 3: Project Management
━━━━━━━━━━━━━━━━━━━━━━━━
3.1 Process Model — SDLC المختار مع مبرر (Agile / Waterfall)
3.2 Risk Management — جدول: الخطر | المستوى | خطة التخفيف
3.3 Project Activities Plan — Gantt Chart أسبوعي

━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 4: Requirement Collection and Analysis
━━━━━━━━━━━━━━━━━━━━━━━━
4.1 Requirement Elicitation
   موصى: مقابلة خبير حتى لو المشروع لا يحتاجها — لفهم المجال أعمق

4.2 System Requirements
   وظيفية (5+): ركّز على الوظائف الأساسية
   مثال جيد: "البحث بفلاتر متعددة" | مثال ضعيف: "تسجيل الدخول"
   غير وظيفية (5+) مع كيفية تطبيقها:
   مثال: Security: CSRF token في جميع النماذج

4.3 System Models
   ↳ System Architecture — مخطط مكونات النظام
   ↳ ERD — إذا كانت قاعدة بيانات علائقية
      (NoSQL: ضع Data Dictionary Diagram بدلاً منها)

━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 5: System Design
━━━━━━━━━━━━━━━━━━━━━━━━
• مخطط قاعدة البيانات مع شرح الجداول الرئيسية
• Wireframes للوظائف الأساسية (5 على الأقل) مع شرح التدفق
• Pseudocode للخوارزميات الأساسية

━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 6: System Implementation and Testing
━━━━━━━━━━━━━━━━━━━━━━━━
6.1 System Implementation
   الأدوات + لقطات شاشة + شرح تدفق النظام

6.2 Evaluation and Testing
   اختبارات أمنية (من مساقات Ethical Hacking / Pen Testing):
   جدول: معيار الاختبار | الهدف | النتيجة (Pass/Fail) | الشرح
   مثال: SQL Injection | نموذج تسجيل الدخول | Pass | ...

   قياس الأداء:
   • اختر الدوال الأساسية وقِس وقت تنفيذها
   • اذكر مواصفات الجهاز (CPU، RAM)
   • هل يعمل مع عدد كبير من المستخدمين/العينات؟

━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 7: Conclusion and Future Work
━━━━━━━━━━━━━━━━━━━━━━━━
ملخص + نتائج + قيود + أفكار مستقبلية.

━━━━━━━━━━━━━━━━━━━━━━━━
References — Harvard referencing style

━━━━━━━━━━━━━━━━━━━━━━━━
📐 إعدادات التنسيق
━━━━━━━━━━━━━━━━━━━━━━━━
• A4 Portrait | هوامش: أعلى/أسفل 2.5cm | يسار 3cm | يمين 2cm
• TNR 11pt تباعد 1.5 | عناوين الفصول TNR 18pt Bold Center`,
    },

    template_cy_research: {
      keywords: ["قالب cy research", "cy research template", "تمبلت cy research", "قالب بحث cy", "قالب بحث سيبر", "قالب بحث امن المعلومات", "ابي قالب بحث cy", "اريد قالب بحث cy", "cyber research template", "cybersecurity research template"],
      answer: `📄 قالب تقرير البحث — Cybersecurity (CY)
🏛️ جامعة البحرين | كلية تقنية المعلومات | قسم نظم المعلومات
📋 B.Sc. In Cybersecurity | ITXX 499

━━━━━━━━━━━━━━━━━━━━━━━━
صفحة الغلاف
━━━━━━━━━━━━━━━━━━━━━━━━
• عنوان المشروع
• أسماء الطلاب وأرقامهم
• اسم المشرف + المشرف المشارك
• السنة الأكاديمية والفصل

━━━━━━━━━━━━━━━━━━━━━━━━
Abstract
━━━━━━━━━━━━━━━━━━━━━━━━
تعريف المشروع + المشكلة + ملخص التحليل + النتائج مع قياسات الأداء.

Acknowledgments — شكر المشرف والعائلة والمساعدين.

━━━━━━━━━━━━━━━━━━━━━━━━
جدول المحتويات
━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 1  Introduction ............. 1
Chapter 2  Literature Review ........ 2
Chapter 3  Project Management ....... 3
Chapter 4  Requirement Collection & Analysis .. 4
Chapter 5  System Design ............ 6
Chapter 6  System Implementation & Testing .. 7
Chapter 7  Conclusion and Future Work . 8
References .......................... 9

━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 1: Introduction
━━━━━━━━━━━━━━━━━━━━━━━━
1.1 Problem Statement — مدعوم بأدلة وأرقام
1.2 Project Objectives — النطاق + الجمهور + التأثير + القيود
1.3 Relevance/Significance — مساهمات المشروع
1.4 Report Outline

━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 2: Literature Review
━━━━━━━━━━━━━━━━━━━━━━━━
ناقش 3+ أبحاث: ملخص + الوظيفة + القوة والضعف + ما ستستفيده.

━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 3: Project Management
━━━━━━━━━━━━━━━━━━━━━━━━
3.1 Process Model | 3.2 Risk Management | 3.3 Gantt Chart

━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 4: Requirement Collection and Analysis
━━━━━━━━━━━━━━━━━━━━━━━━
4.1 Requirement Elicitation
4.2 System Requirements (وظيفية 5+ | غير وظيفية 5+)
4.3 System Models:
   ↳ System Architecture
   ↳ ERD أو NoSQL Dictionary Diagram

━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 5: System Design
━━━━━━━━━━━━━━━━━━━━━━━━
• مخطط قاعدة البيانات
• Wireframes للوظائف الأساسية (5+) مع شرح التدفق
• Pseudocode للخوارزميات الأساسية

━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 6: System Implementation and Testing
━━━━━━━━━━━━━━━━━━━━━━━━
6.1 System Implementation — أدوات + لقطات شاشة + شرح التدفق

6.2 Evaluation and Testing
   اختبارات أمنية (SQL Injection, XSS, CSRF, إلخ):
   جدول: معيار | هدف | نتيجة | شرح

   قياس الأداء:
   • وقت تنفيذ الدوال الأساسية
   • مواصفات الجهاز المستخدم
   • هل يتحمّل عدداً كبيراً من المستخدمين؟

   يمكن استخدام Code Review Tool وإرفاق التقرير وشرح النقاط الرئيسية.

━━━━━━━━━━━━━━━━━━━━━━━━
Chapter 7: Conclusion and Future Work
━━━━━━━━━━━━━━━━━━━━━━━━
ملخص + نتائج + قيود + أفكار مستقبلية.

━━━━━━━━━━━━━━━━━━━━━━━━
References — Harvard referencing style

━━━━━━━━━━━━━━━━━━━━━━━━
📐 إعدادات التنسيق
━━━━━━━━━━━━━━━━━━━━━━━━
• A4 Portrait | هوامش: أعلى/أسفل 2.5cm | يسار 3cm | يمين 2cm
• TNR 11pt تباعد 1.5 | عناوين الفصول TNR 18pt Bold Center`,
    },
  },
  en: {
    supervisors_cs: {
      keywords: ["cs supervisors"],
      answer: `CS Supervisors available.`,
    },
    templates_en: {
      keywords: ["what templates", "available templates", "which template", "show templates", "list templates", "all templates"],
      answer: `📚 Available Templates — University of Bahrain

Type the template name to get its full content:

━━━━━━━━━━━━━━━━━━━━━━━━

🔵 CS — Computer Science
• "CS System Template" — System Report CS/IS
• "CS Research Template" — Research Report CS

🟢 CY — Cybersecurity
• "CY System Template" — System Report Cybersecurity
• "CY Research Template" — Research Report Cybersecurity

🟠 CE — Computer Engineering
• "CE Template" — System Report CE

💡 Not sure? Tell me your major and project type (system or research).`,
    },
  },
}

// --- Chatbot Component ---
interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { language } = useLanguage()
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [isMaximized, setIsMaximized] = useState(false)


  const t = useCallback(
    (key: string) => {
      const translations: Record<string, Record<string, string>> = {
        aiAssistant: { ar: "مساعد المنصة الذكي", en: "GP Platform Assistant" },
        aiWelcomeMessage: { ar: "مرحبا! أنا مساعد منصة التخرج", en: "Hello! I'm the GP Platform Assistant" },
        chatbotHelp: {
          ar: "اسألني أي سؤال عن النظام، المشاريع، المهام، أو أي شيء آخر وسأساعدك فورا.",
          en: "Ask me anything about the system, projects, tasks, or anything else and I'll help you right away.",
        },
        typeYourQuestion: { ar: "اكتب سؤالك هنا...", en: "Type your question here..." },
        clearChat: { ar: "مسح المحادثة", en: "Clear chat" },
        poweredBy: { ar: "مدعوم بالذكاء الاصطناعي DeepSeek", en: "Powered by DeepSeek AI" },
      }
      return translations[key]?.[language] || translations[key]?.["ar"] || key
    },
    [language]
  )

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
    }
  }, [messages])

  const adjustTextareaHeight = () => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = { id: Date.now().toString(), role: "user", content: input.trim() }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput("")
    setIsLoading(true)
    if (textareaRef.current) textareaRef.current.style.height = "auto"

    try {
      // --- Knowledge Base lookup (longest match wins) ---
      let kbAnswer = ""
      let bestMatchLength = 0
      for (const topic in knowledgeBase[language]) {
        const entry = knowledgeBase[language][topic]
        for (const kw of entry.keywords) {
          if (
            input.toLowerCase().includes(kw.toLowerCase()) &&
            kw.length > bestMatchLength
          ) {
            bestMatchLength = kw.length
            kbAnswer = entry.answer
          }
        }
      }

      if (kbAnswer) {
        setMessages((prev) => [
          ...prev,
          { id: (Date.now() + 1).toString(), role: "assistant", content: kbAnswer },
        ])
      } else {
        // --- Call AI API ---
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
            language,
          }),
        })

        const textData = await response.text() // Use text() to avoid JSON parse errors
        setMessages((prev) => [
          ...prev,
          { id: (Date.now() + 1).toString(), role: "assistant", content: textData },
        ])
      }
    } catch (error) {
      console.error("Chatbot error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          language === "ar"
            ? "عذرا، حدث خطأ في الاتصال بالمساعد الذكي. يرجى المحاولة مرة أخرى."
            : "Sorry, there was an error connecting to the AI assistant. Please try again.",
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickQuestion = (question: string) => {
    setInput(question)
    setTimeout(() => {
      const form = document.querySelector("#chatbot-form") as HTMLFormElement
      if (form) form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
    }, 100)
  }

  const clearMessages = () => setMessages([])

  const quickQuestions =
    language === "ar"
      ? ["كيف أقدم فكرة مشروع؟", "كيف أسلم مهمة؟", "أين أجد درجاتي؟", "وش القوالب المتاحة؟"]
      : ["How do I submit a project idea?", "How do I submit a task?", "Where can I find my grades?", "what templates are available?"]

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-50 h-16 w-16 rounded-full shadow-2xl hover:shadow-3xl transition-all hover:scale-110 bg-gradient-to-br from-primary via-accent to-primary glow-effect animate-float"
        size="icon"
        aria-label="Open AI Assistant"
      >
        <Bot className="h-7 w-7" />
        <Sparkles className="h-4 w-4 absolute -top-1 -left-1 text-yellow-300 animate-pulse" />
      </Button>
    )
  }

  return (
    <Card
      className={`
        fixed bottom-6 left-6 flex flex-col
        shadow-2xl z-50 border-2 border-primary/30 glass-effect glow-effect animate-scale-in
        ${isMaximized
          ? "w-[90vw] max-w-[50rem] h-[90vh] max-h-[90vh]" 
          : "w-80 max-w-[95vw] h-[32rem] md:h-[36rem]"   
        }
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-l from-primary via-accent to-primary text-primary-foreground rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="relative animate-float">
            <Bot className="h-6 w-6" />
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50" />
          </div>
          <div>
            <h3 className="font-bold text-sm">{t("aiAssistant")}</h3>
            <p className="text-[10px]">DeepSeek AI</p>
          </div>
        </div>
        <div className="flex gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearMessages}
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20 transition-all hover:scale-110"
              title={t("clearChat")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMaximized(!isMaximized)}
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20 transition-all hover:scale-110"
          >
            {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20 transition-all hover:scale-110"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto" ref={scrollRef}>
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center space-y-4 animate-in fade-in duration-500">
                  <div className="flex justify-center">
                    <div className="p-5 bg-gradient-to-br from-primary/20 to-accent/10 rounded-full animate-float glow-effect">
                      <Bot className="h-14 w-14 text-primary" />
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-xl mb-2 bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">
                      {t("aiWelcomeMessage")}
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{t("chatbotHelp")}</p>
                  </div>

                  <div className="space-y-2 pt-4">
                    <p className="text-xs font-semibold text-muted-foreground">
                      {language === "ar" ? "أسئلة سريعة:" : "Quick questions:"}
                    </p>
                    {quickQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuickQuestion(question)}
                        className="w-full text-right text-sm p-3 rounded-lg glass-effect hover:border-primary/50 transition-all duration-300 hover:scale-[1.02] border border-border"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex animate-slide-up ${message.role === "user" ? "justify-start" : "justify-end"}`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-md break-words whitespace-pre-wrap leading-relaxed ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-bl-none text-right"
                        : "glass-effect rounded-br-none border border-border text-left"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="border-t bg-gradient-to-l from-muted/50 to-muted/20 p-3">
            <form id="chatbot-form" onSubmit={handleSubmit} className="flex items-end gap-2">
              <Textarea
                ref={(el) => {
                  textareaRef.current = el
                }}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  setTimeout(adjustTextareaHeight, 0)
                }}
                placeholder={t("typeYourQuestion")}
                disabled={isLoading}
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    const form = (e.target as HTMLElement).closest("form")
                    if (form) form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
                  }
                }}
                className="flex-1 min-h-[40px] max-h-[160px] resize-none overflow-auto bg-background text-foreground placeholder:text-muted-foreground border border-input rounded-md px-3 py-2"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim()}
                className="shrink-0 h-11 w-11 bg-gradient-to-l from-primary to-accent hover:from-primary/90 hover:to-accent/90 glow-effect transition-all hover:scale-110"
              >
                <Send className="h-5 w-5" />
              </Button>
            </form>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">{t("poweredBy")}</p>
          </div>
        </>
      )}
    </Card>
  )
}
