import React, { useState, useCallback, FC, ChangeEvent, Fragment, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Chat } from "@google/genai";

// Initialize the Gemini AI client
const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

const SYSTEM_INSTRUCTION = `You are an attorney/legal counsel at a top-tier intellectual property law firm, specializing in preparing strong patent invalidity arguments.
Your task is to evaluate the strength of a prior art combination for an obviousness attack against a subject patent. You must analyze the provided prior art references and map their elements to the subject patent's claims.

--- FUNDAMENTAL DIRECTIVE: DOCUMENT ROLES ---
**This is your most important directive. Failure to adhere to it will result in a complete failure of your task.**

1.  **SUBJECT PATENT:** This is the patent being challenged. The user will provide it under the "Provide Subject Patent" input section.
    *   **ITS ONLY ROLE:** The claims from the Subject Patent are used to populate the **first column ("Claim Clause")** of the Overlap Table.
    *   **STRICT PROHIBITION:** Text from the Subject Patent's description or claims MUST NEVER, under any circumstances, be used to fill the columns for the prior art references.

2.  **PRIOR ART REFERENCES:** These are the documents used as evidence against the Subject Patent. The user will provide them under the "Provide Prior Art References" input section.
    *   **ITS ONLY ROLE:** The content from these references is used to populate all other columns in the table (e.g., "Martin", "Reference 1"). This content is the evidence that you map *against* the claim clauses from the Subject Patent.

**Confusing these two sources is a critical error. You must maintain a strict separation between the Subject Patent (the target) and the Prior Art (the evidence). Treat only the files/text provided in the 'Provide Subject Patent' section as the subject patent, and only the files/text in the 'Provide Prior Art References' section as the prior art. There are no exceptions.**

--- CORE DIRECTIVE: ANALYSIS PROTOCOL AND QUALITY ---

Your performance will be judged on the thoroughness, accuracy, and consistency of your analysis. These are not suggestions; they are mandatory protocols.

1.  **ADHERENCE TO USER INSTRUCTIONS:** If the user provides a "SPECIFIC INSTRUCTIONS FOR THIS ANALYSIS" section in their prompt, these instructions are your highest priority and override all other general guidelines if there is a conflict. You must follow them precisely, as they provide the specific context and focus for the analysis. Your entire output, from the paragraphs you select for the Overlap Table to the reasoning in your Analyst Comments, must explicitly and demonstrably reflect your adherence to these specific instructions. Any deviation from these instructions constitutes a complete failure of the task.
2.  **METICULOUS THOROUGHNESS:** Your analysis must be exceptionally thorough and meticulous. Do not rush. Scrutinize every detail of the prior art against the claim clauses. Take the necessary time to ensure your analysis is exhaustive and leaves no room for ambiguity. A rushed, superficial analysis is a failed analysis.
3.  **UNWAVERING CONSISTENCY:** Your findings are final. Once you have mapped an element and determined its level of support, you must stick to that conclusion in all subsequent analysis, summaries, and user interactions. Avoid contradictions at all costs. Your entire output must present a single, unified, and consistent argument.
4.  **EVIDENCE-BASED REASONING:** Every single mapping, or lack thereof, MUST be justified with direct, verbatim quotes and specific location identifiers ([Para xxxx], [Fig. Y]). Do not make assumptions or broad interpretations. If the text does not explicitly state it, it is not supported. Your analysis is a reflection of the documents provided, not your interpretation of what *might* be implied. Your job is to find what IS disclosed, not what COULD be disclosed.
5.  **EXTREME OBJECTIVITY (NO CONFIRMATION BIAS):** You must operate with extreme objectivity. Your primary duty is to identify discrepancies, gaps, and weaknesses, not to force a fit. Be skeptical and critical in your evaluation. It is more valuable to find a single, well-supported gap than to create a weak, inferential link.
6.  **HANDLING USER CHALLENGES:** If the user challenges your analysis, do not simply agree or change your answer. Your first response must be to state that you will re-verify your findings against the source documents. Then, re-evaluate the specific point of contention based ONLY on the provided documents and your strict interpretation rules. Present your re-verified conclusion, either confirming your original analysis or providing a corrected one with a clear, evidence-backed explanation for the change.

--- GUIDELINES FOR ANALYZING REFERENCES ---

Your goal is to assess each reference's usability as relevant prior art and map its elements to the subject patent's claims. Provide a clear analysis without confirmation bias. Your analysis must be concise and strict. If an element is not supported, state it clearly.

1. **Restricted Semantic Analysis:** Your primary mode of analysis is to find explicit, literal support in the prior art for each claim element. While you can identify synonyms or directly equivalent technical terms (e.g., "fastener" for "screw"), you are **strictly forbidden** from making inferential leaps or interpreting broad concepts. The mapping must be direct and obvious. If a reasonable person would need to make an assumption to connect the prior art to the claim, the element is "Not Supported" or, at best, "Inferentially Supported". Your analysis must be grounded in what the text *says*, not what it might imply.

2. **Prioritization of Content:** The paragraphs you select for the overlap table must be the ones that contain the most explicit and relevant text that directly maps to the claim element.

3. **Detailed and Factual Commentary:** In the "Analyst comments" column, your analysis must explicitly state *how* the disclosed element from the prior art is factually similar to or different from the subject patent's claim element. Avoid speculative language. Explain the degree of explicit overlap, and clearly state what is missing.

**For each prior art reference provided (either as a file or pasted text), you must first identify the inventor's name. Assume the first proper name of a person mentioned in the document is the inventor. From this name, extract only the surname (last name).**

--- CRITICAL INSTRUCTION ON DATA SOURCES ---

**As stated in your Fundamental Directive, the separation of sources is non-negotiable.** The text provided in the columns for the prior art references (e.g., "Martin", "Reference 1") MUST come exclusively from the prior art documents/text you were given. Under no circumstances should you ever use text from the subject patent's description or claims to fill these columns. Your analysis is about mapping the *prior art* to the claims, not explaining the claims with their own description. Confusing these two sources is a critical failure.

--- CRITICAL INSTRUCTION ON CLAIM CLAUSE HANDLING ---

This is your most important instruction. Failure to follow it will render your entire analysis useless.

**USER-PROVIDED CLAUSES OVERRIDE:** If the user provides a pre-broken list of claim clauses in their prompt, those clauses take absolute priority. You MUST use the user-provided list to structure the table rows exactly as given. The rules below regarding claim splitting only apply when you are parsing the claim yourself from a full text document or pasted claim.

You are **absolutely forbidden** from altering the structure of the patent claim as provided by the user. Your primary directive is to preserve the exact structure of the claim clauses.

- **ONE CLAUSE, ONE ROW:** Each distinct clause from the patent **MUST** correspond to a single, unique row in the table.
- **DO NOT SPLIT:** Under no circumstances are you to split a single claim clause into multiple smaller pieces or rows on your own initiative.
- **THE ONLY EXCEPTION:** The *only* time you are ever permitted to split a clause is if a single clause is so exceptionally long that it is impossible to read. In this extremely rare situation, and *only* this situation, you may divide it into a **maximum of TWO (2)** parts, creating two corresponding rows. Splitting a clause into three or more parts is a direct and critical violation of your instructions.

Again, maintain the original structure of the claim clauses unless absolutely forced to split a very long one into a maximum of two parts.

--- FINAL OUTPUT FORMAT ---
After your analysis, you must present your findings strictly in the following structure. Do not deviate from this format. Your entire response must only contain the following components and nothing else. Do not include a "Suggestions to Address Gaps" section.

**The Overlap Table is the most critical part of your output. Do not omit it under any circumstances.**

COMBINATION ANALYSIS

**Overlap Table**

Create a single markdown table using the exact format below, including the header separator line. The table must have a number of columns equal to the number of references plus two (n+2). Your entire analysis of the claim clauses must be presented within this one table. **Do not create any other tables, such as a separate 'Level of Support' table.**

- **Column 1 Header:** "Claim Clause". This column must list all the clauses of the claim in focus from the subject patent, each in a separate row, following the critical handling rules above.
- **Column 2 to n+1 Headers:** Use the extracted inventor's surname for each reference (e.g., "Martin", "George"). If you cannot confidently identify an inventor's name from a reference, you must use the default "Reference X" format (e.g., "Reference 1").
- For each claim clause, these columns must contain the **entire, unabbreviated paragraph** from the respective reference that contains the most relevant text. Do not use '...' or any other method to truncate the paragraph.
- Within that full paragraph, the most relevant **complete sentence or sentences** that map to the claim clause **must be highlighted by making them bold**.
- The text must be prefixed with its location. For paragraphs, you must use the format \`[Para xxxx]\`, where xxxx is the paragraph number (e.g., \`[Para 0074]\`). For pages, use \`[Page xxxx]\`. Do not use just the number in brackets like \`[0074]\`. **Immediately after this location prefix, you must insert a newline character (\\n) before the actual text begins.**
- If you are citing text from multiple locations (i.e., different paragraphs) within the same reference for a single claim clause, you must place the content from each paragraph on a new line within the same table cell by using a newline character (\\n). Each paragraph must have its own location prefix (followed by a newline) and its own bolded relevant text.
- **Do not use any HTML tags like \`<br>\` for formatting.**
- **Column n+2 (Last Column) Header:** "Analyst comments". This column must contain your detailed analysis. For each claim clause, the content of this cell must be structured as follows:
    - **First Line:** State the strength of overlap using ONLY ONE of these four classifications: "Supported", "Inferentially Supported", "Partially Supported", or "Not Supported".
    - **Following Paragraph:** Provide your detailed analysis of how the claim clause is or is not supported by the combination of references. Do not use broad interpretations. If there are interpretation conflicts or ambiguities, highlight them here. Use a newline character to separate the strength classification from the detailed analysis. **Again, do not use HTML tags.**

Example of the required markdown format:
| Claim Clause | Martin | Analyst comments |
|---|---|---|
| 1a. A widget with a gear. | [Para 0042]\\nThe apparatus **contains a widget and a corresponding gear which allows for rotational movement.** The gear is made of steel. | Supported\\nThe reference explicitly discloses this feature. |
| 1b. The gear being red. | | Not Supported\\nThe color of the gear is not mentioned. This is a potential gap. |
| 1c. A handle attached to the widget. | [Para 0012]\\nSome text here. **The widget includes a handle for manipulation by the user.** More text here.\\n[Para 0055]\\nFurthermore, **the handle is further described as being made of a polymer material** which is lightweight. | Supported\\nMultiple sections of the reference describe the handle. |

**Overall Summary**

Directly below the table, you must provide a summary with the following distinct sections:

**Summary of Combination:**
In the initial paragraphs, provide a brief summary of the combination's overall effectiveness and its overlap with the claim elements.

**Possible Inference(s):**
If applicable, create this section and list any claim elements that are inferentially, but not directly, mapped by the combination.

**Possible Weakness(es):**
Create this section and highlight the specific weaknesses of the combination, detailing which claim limitations are not adequately covered.

Now, based on the user's provided document/text, please begin your analysis following these instructions precisely.
`;

const SYSTEM_INSTRUCTION_UNDERSTAND = `You are an expert patent analyst with a talent for simplifying complex legal and technical language for a general audience.
Your task is to analyze the provided subject patent information (claim and/or description) and generate a clear, concise summary.

--- GUIDELINES ---
- Analyze the provided patent information to identify the core problem it aims to solve and the proposed solution.
- Break down the main patent claim into its constituent clauses, following the structure of the original claim.
- For each clause, provide a simple, easy-to-understand explanation using real-world examples or analogies. Your explanation must be accurate and directly reflect the claim language.

--- CRITICAL INSTRUCTION ON CLAIM CLAUSE HANDLING ---

This is your most important instruction. Failure to follow it will render your entire analysis useless.

**USER-PROVIDED CLAUSES OVERRIDE:** If the user provides a pre-broken list of claim clauses in their prompt, those clauses take absolute priority. You MUST use the user-provided list to structure the "Claim Clause" column in the table exactly as given. The rules below regarding claim splitting only apply when you are parsing the claim yourself from a full text document or pasted claim.

You are **absolutely forbidden** from altering the structure of the patent claim as provided by the user. Your primary directive is to preserve the exact structure of the claim clauses.

- **ONE CLAUSE, ONE ROW:** Each distinct clause from the patent **MUST** correspond to a single, unique row in the table.
- **DO NOT SPLIT:** Under no circumstances are you to split a single claim clause into multiple smaller pieces or rows on your own initiative.
- **THE ONLY EXCEPTION:** The *only* time you are ever permitted to split a clause is if a single clause is so exceptionally long that it is impossible to read. In this extremely rare situation, and *only* this situation, you may divide it into a **maximum of TWO (2)** parts, creating two corresponding rows. Splitting a clause into three or more parts is a direct and critical violation of your instructions.

Again, maintain the original structure of the claim clauses unless absolutely forced to split a very long one into a maximum of two parts.

--- FINAL OUTPUT FORMAT ---
You must present your findings strictly in the following markdown structure. Do not add any introductory or concluding text. Your entire response must only contain the following components.

**Patent Understanding**

Create a markdown table with the headers "Problem" and "Solution". In the next row, provide a 2-3 line explanation for each.

| Problem | Solution |
|---|---|
| [Your explanation of the problem] | [Your explanation of the solution] |

**Understand the Claim in Focus**

Create a second markdown table.

- **Column 1 Header:** "Claim Clause". This column must list all the clauses of the claim in focus, following the critical handling rules above.
- **Column 2 Header:** "Simplified Explanation". This column must contain your simplified explanation with examples for the corresponding claim clause.

Example of the second table:
| Claim Clause | Simplified Explanation |
|---|---|
| 1a. A portable electronic device comprising a housing. | This just means the gadget has an outer case, like the plastic or metal shell of your smartphone. |
| 1b. a display coupled to the housing; | An screen is attached to that case. Think of the main screen on your phone. |
| 1c. and a processor within the housing configured to execute instructions. | Inside the case, there's a computer chip (the 'brain') that runs the device's software and makes everything work. |

Now, based on the user's provided document/text, please begin your analysis following these instructions precisely.
`;

const SYSTEM_INSTRUCTION_CHAT = `You are a helpful and experienced patent analyst, acting as a colleague to the user. Your name is Nexus.
Your goal is to assist the user by answering follow-up questions about the patent analysis you've just provided.

--- TONE & PERSONALITY ---
- **Collaborative & Conversational:** Talk to the user as you would a teammate. Use "we," "let's take a look," etc. Be friendly and approachable.
- **Avoid Bot-like Language:** Do not say "As an AI model..." or "I am a large language model." You are Nexus, a patent analyst.
- **Clarity over Jargon:** While you understand legal and technical terms, explain concepts clearly and concisely.
- **Proactive and Insightful:** If a user's question is simple, provide the answer but also offer to explore related aspects.

--- CORE DIRECTIVE ---
- **BE CONCISE AND DIRECT:** Your answers must be brief and to the point. Do not provide long explanations unless explicitly asked.
- **DO NOT REPEAT INFORMATION:** The user has the analysis table in front of them. Do not repeat verbatim paragraphs or long quotes from the prior art that are already in the table.
- **REFERENCE THE TABLE:** When a question pertains to information in the table, guide the user's attention back to it. For example, say "Good question. If you look at the 'Martin' column for that clause, you'll see it mentions..." instead of re-stating the entire content.
- **Stay on Topic:** All your answers must relate to the patent documents and the analysis already performed.
- **Admit Limitations:** If you don't know something or if the information isn't in the documents, say so honestly. For example, "I've scanned the documents again, but I can't find any mention of that specific material. It seems to be a gap in the prior art."
- **Maintain Consistency:** Your answers must remain consistent with the initial analysis table you generated.
`;


type SubjectPatentOption = 'file' | 'claim' | 'claim_description' | null;
type PriorArtOption = 1 | 2 | 3 | null;
type Message = {
  sender: 'ai' | 'user';
  text: string;
};
type FileData = { file: File, base64: string, mimeType: string };
type Reference = {
  file: FileData | null;
  text: string;
};
type HistoryPart = { text?: string; inlineData?: { data: string; mimeType: string; }; };
type AnalysisHistory = {
  id: string;
  name: string;
  result: string;
  userParts: HistoryPart[];
};

const fileToBase64 = (file: File): Promise<{ base64: string, mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const encoded = (reader.result as string).split(',')[1];
      resolve({ base64: encoded, mimeType: file.type });
    };
    reader.onerror = error => reject(error);
  });
};


const FileInput: FC<{ onFileChange: (file: File | null) => void, fileName?: string, id?: string }> = ({ onFileChange, fileName, id }) => {
  const [currentFileName, setCurrentFileName] = useState<string>(fileName || '');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCurrentFileName(file.name);
      onFileChange(file);
    } else {
      setCurrentFileName('');
      onFileChange(null);
    }
  };
  
  useEffect(() => {
    setCurrentFileName(fileName || '');
  }, [fileName]);

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  const handleRemoveFile = () => {
    setCurrentFileName('');
    onFileChange(null);
    if (inputRef.current) {
      inputRef.current.value = ''; // Reset the file input so the same file can be re-uploaded
    }
  };

  return (
    <div className="file-input-container">
      <button type="button" className="upload-btn" onClick={handleButtonClick}>
        Upload File
      </button>
      <input 
        type="file"
        id={id}
        ref={inputRef}
        style={{ display: 'none' }}
        accept=".pdf,.docx" 
        onChange={handleFileChange}
        aria-label={fileName ? `Change file ${fileName}` : 'Upload file'}
      />
      {currentFileName && (
        <div className="file-display">
          <p className="file-name" title={currentFileName}>{currentFileName}</p>
          <button 
            type="button" 
            className="remove-file-btn" 
            onClick={handleRemoveFile} 
            aria-label={`Remove file ${currentFileName}`}
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
};

const ReferenceColumn: FC<{ 
  referenceNumber: number; 
  onFileChange: (file: File | null) => void;
  onTextChange: (text: string) => void;
  reference: Reference;
}> = ({ referenceNumber, onFileChange, onTextChange, reference }) => {

  return (
    <div className="reference-column" role="region" aria-labelledby={`ref-heading-${referenceNumber}`}>
      <h3 id={`ref-heading-${referenceNumber}`}>Reference #{referenceNumber}</h3>
      <div className="form-group form-group-inline">
        <label htmlFor={`ref-file-${referenceNumber}`}>Upload Document</label>
        <FileInput 
          id={`ref-file-${referenceNumber}`}
          onFileChange={onFileChange} 
          fileName={reference.file?.file.name} 
        />
      </div>
      <div className="or-separator">OR</div>
      <div className="form-group">
        <label htmlFor={`reference-text-${referenceNumber}`}>Paste Text from Reference</label>
        <textarea
          id={`reference-text-${referenceNumber}`}
          className="form-control"
          placeholder="Paste reference text here..."
          value={reference.text}
          onChange={(e) => onTextChange(e.target.value)}
        ></textarea>
      </div>
    </div>
  );
};

const ChatWindow: FC<{ 
  messages: Message[]; 
  onSendMessage: (text: string) => void; 
  isLoading: boolean; 
  onHide: () => void;
  height: number;
  setHeight: (height: number) => void;
}> = ({ messages, onSendMessage, isLoading, onHide, height, setHeight }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatSectionRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isLoading]);
  
  const handleSend = () => {
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = chatSectionRef.current?.offsetHeight ?? height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
        const newHeight = startHeight + (moveEvent.clientY - startY);
        if (newHeight >= 400) { // Enforce min-height
            setHeight(newHeight);
        }
    };

    const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <section 
      ref={chatSectionRef}
      className="chat-section" 
      aria-live="polite"
      style={{ height: `${height}px` }}
    >
      <header className="chat-header">
        <h3>Chat with Nexus</h3>
        <button className="chat-hide-btn" onClick={onHide}>Hide Chat</button>
      </header>
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender}`}>
            <p>{msg.text.replace(/\*/g, '')}</p>
          </div>
        ))}
        {isLoading && (
           <div className="message ai">
             <p><span className="typing-indicator"></span></p>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-area">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask a follow-up question..."
          aria-label="Chat input"
          disabled={isLoading}
        />
        <button onClick={handleSend} aria-label="Send message" disabled={isLoading}>Send</button>
      </div>
      <div className="chat-resize-handle" onMouseDown={handleResizeMouseDown} title="Resize chat window"></div>
    </section>
  );
};

const ResultDisplay: FC<{ content: string }> = ({ content }) => {
  const generateExportableHtml = (): string => {
    const htmlParts: string[] = [];
    const lines = content.split('\n');
    let inTable = false;
    let tableBuffer: string[][] = [];

    const flushTableToHtml = () => {
      if (tableBuffer.length > 1) {
        htmlParts.push('<table>');
        const headers = tableBuffer[0];
        const rows = tableBuffer.slice(2);

        htmlParts.push('<thead><tr>');
        headers.forEach(h => htmlParts.push(`<th>${h.trim()}</th>`));
        htmlParts.push('</tr></thead>');

        htmlParts.push('<tbody>');
        rows.forEach(row => {
          htmlParts.push('<tr>');
          row.forEach(cell => {
            const cellContent = cell.trim()
              .replace(/\\n/g, '<br>')
              .replace(/<br\s*\/?>/gi, '<br>')
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            htmlParts.push(`<td>${cellContent}</td>`);
          });
          htmlParts.push('</tr>');
        });
        htmlParts.push('</tbody></table>');
      }
      tableBuffer = [];
    };

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
        inTable = true;
        const cells = trimmedLine.split('|').slice(1, -1);
        tableBuffer.push(cells);
      } else {
        if (inTable) {
          flushTableToHtml();
          inTable = false;
        }
        if (/^(COMBINATION|OVERLAP) ANALYSIS$/.test(trimmedLine)) {
          htmlParts.push(`<h2>${trimmedLine}</h2>`);
        } else if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
          htmlParts.push(`<h3>${trimmedLine.replace(/\*/g, '')}</h3>`);
        } else if (trimmedLine.length > 0) {
          htmlParts.push(`<p>${trimmedLine.replace(/\*/g, '')}</p>`);
        }
      }
    }
    flushTableToHtml();

    const finalHtmlContent = htmlParts.join('\n');

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Patent Analysis Export</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 2rem auto; padding: 1rem; }
          h2 { font-size: 1.75rem; border-bottom: 2px solid #7cc4ef; padding-bottom: 0.75rem; margin-bottom: 1.5rem; color: #154D71; }
          h3 { font-size: 1.3rem; color: #154D71; margin-top: 2rem; margin-bottom: 1rem; }
          p { color: #5A7A90; margin-bottom: 1rem; white-space: pre-wrap; }
          table { width: 100%; border-collapse: collapse; margin-top: 1rem; margin-bottom: 2rem; font-size: 0.95rem; }
          td, th { border: 1px solid #d1e3f3; padding: 0.85rem; text-align: left; vertical-align: top; }
          th { background-color: #1C6EA4; color: #F2F2F2; font-weight: 700; }
          tbody tr:nth-child(even) { background-color: #f8fcff; }
          strong { font-weight: bold; }
        </style>
      </head>
      <body>
        ${finalHtmlContent}
      </body>
      </html>
    `;
    return fullHtml;
  };
  
  const handleDownload = () => {
    const fullHtml = generateExportableHtml();
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'patent-analysis.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleViewInNewTab = () => {
    const fullHtml = generateExportableHtml();
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  // FIX: Replaced JSX.Element with React.ReactElement to resolve "Cannot find namespace 'JSX'" error.
  const elements: React.ReactElement[] = [];
  const lines = content.split('\n');
  let inTable = false;
  let tableBuffer: string[][] = [];
  let keyCounter = 0;
  let title = '';
  let contentToRender = content;

  const firstRealLine = lines.find(l => l.trim().length > 0);
  if (firstRealLine && /^(COMBINATION|OVERLAP) ANALYSIS$/.test(firstRealLine.trim())) {
    title = firstRealLine.trim();
    contentToRender = lines.slice(lines.indexOf(firstRealLine) + 1).join('\n');
  } else {
    title = 'Analysis Result';
  }

  // FIX: Replaced JSX.Element with React.ReactElement to resolve "Cannot find namespace 'JSX'" error.
  const renderMarkdownBold = (text: string): (string | React.ReactElement)[] => {
    const regex = /\*\*(.*?)\*\*/g;
    // FIX: Replaced JSX.Element with React.ReactElement to resolve "Cannot find namespace 'JSX'" error.
    const parts: (string | React.ReactElement)[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(<strong key={lastIndex}>{match[1]}</strong>);
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : [text];
  };

  const renderAnalystComment = (cellContent: string) => {
    const contentWithoutAsterisks = cellContent.replace(/\*/g, '');
    const cellLines = contentWithoutAsterisks.split('\n');
    const firstLine = cellLines[0].trim();
    const restOfContent = cellLines.slice(1).join('\n');

    const supportLevels = [
      { level: "Inferentially Supported", className: "inferentially-supported" },
      { level: "Partially Supported", className: "partially-supported" },
      { level: "Not Supported", className: "not-supported" },
      { level: "Supported", className: "supported" },
    ];
    
    for (const { level, className } of supportLevels) {
      if (firstLine.startsWith(level)) {
        return (
          <Fragment key={firstLine}>
            <span className={`support-level ${className}`}>{firstLine}</span>
            {restOfContent && <>{'\n'}{restOfContent}</>}
          </Fragment>
        );
      }
    }
    return <>{contentWithoutAsterisks}</>;
  };


  const flushTable = () => {
    if (tableBuffer.length > 0) {
      const headers = tableBuffer[0];
      const rows = tableBuffer.slice(2); // Skip header and separator line
      elements.push(
        <table key={`table-${keyCounter++}`}>
          <thead>
            <tr>{headers.map((h, i) => <th key={i}>{h.trim()}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => {
                  const cleanedCell = cell.trim().replace(/<br\s*\/?>/gi, '\n').replace(/\\n/g, '\n');
                  const isAnalystColumn = headers[j]?.trim().toLowerCase().includes('analyst');
                  return (
                    <td key={j}>
                      {isAnalystColumn ? renderAnalystComment(cleanedCell) : renderMarkdownBold(cleanedCell)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      );
      tableBuffer = [];
    }
  };

  for (const line of contentToRender.split('\n')) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
      inTable = true;
      const cells = trimmedLine.split('|').slice(1, -1);
      tableBuffer.push(cells);
    } else {
      if (inTable) {
        flushTable();
        inTable = false;
      }
      if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
        elements.push(<h3 key={`h3-${keyCounter++}`}>{trimmedLine.replace(/\*/g, '')}</h3>);
      } else if (trimmedLine.length > 0) {
          elements.push(<p key={`p-${keyCounter++}`}>{trimmedLine.replace(/\*/g, '')}</p>);
      }
    }
  }
  flushTable(); // Ensure the last table is rendered

  return (
    <section className="card result-card" aria-labelledby="analysis-heading">
      <div className="result-card-header">
        <h2 id="analysis-heading">{title}</h2>
        <div className="export-actions">
           <button onClick={handleViewInNewTab} className="export-btn" aria-label="View analysis in a new tab">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            <span>View</span>
          </button>
          <button onClick={handleDownload} className="export-btn" aria-label="Download analysis results">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Download</span>
          </button>
        </div>
      </div>
      <div className="result-card-body" aria-live="polite" aria-atomic="true">
        {elements}
      </div>
    </section>
  );
};

const UnderstandingDisplay: FC<{ content: string }> = ({ content }) => {
  // FIX: Replaced JSX.Element with React.ReactElement to resolve "Cannot find namespace 'JSX'" error.
  const elements: React.ReactElement[] = [];
  const lines = content.split('\n');
  let inTable = false;
  let tableBuffer: string[][] = [];
  let keyCounter = 0;

  const flushTable = () => {
    if (tableBuffer.length > 0) {
      const headers = tableBuffer[0];
      const rows = tableBuffer.slice(2); 
      elements.push(
        <table key={`table-${keyCounter++}`}>
          <thead>
            <tr>{headers.map((h, i) => <th key={i}>{h.trim()}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => <td key={j}>{cell.trim()}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      );
      tableBuffer = [];
    }
  };

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
      inTable = true;
      const cells = trimmedLine.split('|').slice(1, -1);
      tableBuffer.push(cells);
    } else {
      if (inTable) {
        flushTable();
        inTable = false;
      }
      if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
        elements.push(<h3 key={`h3-${keyCounter++}`}>{trimmedLine.slice(2, -2)}</h3>);
      } else if (trimmedLine.length > 0) {
        elements.push(<p key={`p-${keyCounter++}`}>{trimmedLine}</p>);
      }
    }
  }
  flushTable(); 

  return <>{elements}</>;
};

const ThemeToggle: FC<{ theme: string; onToggle: () => void }> = ({ theme, onToggle }) => {
  return (
    <button
      className="theme-toggle-btn"
      onClick={onToggle}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
      )}
    </button>
  );
};


const App: FC = () => {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [subjectPatentOption, setSubjectPatentOption] = useState<SubjectPatentOption>(null);
  const [priorArtOption, setPriorArtOption] = useState<PriorArtOption>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isChatVisible, setIsChatVisible] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const isCancelledRef = useRef<boolean>(false);
  const chatSectionRef = useRef<HTMLDivElement>(null);
  
  // State for inputs
  const [claimNumber, setClaimNumber] = useState('');
  const [claimNumberError, setClaimNumberError] = useState<string>('');
  const [subjectFile, setSubjectFile] = useState<FileData | null>(null);
  const [subjectClaimText, setSubjectClaimText] = useState('');
  const [subjectDescriptionText, setSubjectDescriptionText] = useState('');
  const [references, setReferences] = useState<Reference[]>([]);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [chatHeight, setChatHeight] = useState(650);
  
  // State for "Understand Patent" feature
  const [understandingResult, setUnderstandingResult] = useState<string>('');
  const [isUnderstandingLoading, setIsUnderstandingLoading] = useState<boolean>(false);
  const [isUnderstandingVisible, setIsUnderstandingVisible] = useState<boolean>(false);

  // State for history
  const [history, setHistory] = useState<AnalysisHistory[]>([]);
  const [isHistoryVisible, setIsHistoryVisible] = useState<boolean>(false);
  
  // New state for specific instructions and claim breaking
  const [specificInstructions, setSpecificInstructions] = useState('');
  const [isBreakingClaim, setIsBreakingClaim] = useState(false);
  const [claimClauses, setClaimClauses] = useState<string[]>(['', '', '']);
  const [isAddingInstructions, setIsAddingInstructions] = useState(false);


  const subjectOptions: { key: SubjectPatentOption; label: string }[] = [
    { key: 'file', label: 'Upload File' },
    { key: 'claim', label: 'Paste Claim' },
    { key: 'claim_description', label: 'Paste Claim & Description' },
  ];

  const priorArtOptions: { key: PriorArtOption; label: string }[] = [
    { key: 1, label: 'Single Reference' },
    { key: 2, label: 'Two-Way Combination' },
    { key: 3, label: 'Three-Way Combination' },
  ];
  
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleThemeToggle = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };
  
  useEffect(() => {
    if (priorArtOption === null) {
      setReferences([]);
    } else {
      setReferences(currentRefs => {
        const newRefs = Array.from({ length: priorArtOption }, (_, i) => currentRefs[i] || { file: null, text: '' });
        return newRefs;
      });
    }
  }, [priorArtOption]);

  // Effect to manage the timer
  useEffect(() => {
    let intervalId: number | undefined;

    if (isLoading) {
      setElapsedTime(0); // Reset on start
      intervalId = window.setInterval(() => {
        setElapsedTime(prevTime => prevTime + 1);
      }, 1000);
    }

    return () => { // Cleanup function
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isLoading]); // Reruns when isLoading changes
  
  // Effect to scroll to chat window
  useEffect(() => {
    if (isChatVisible) {
      setTimeout(() => {
          chatSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100); // Small delay to ensure the element is rendered
    }
  }, [isChatVisible]);


  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };


  const handleSubjectFileChange = useCallback((file: File | null) => {
    if (file) {
      fileToBase64(file).then(({ base64, mimeType }) => {
        setSubjectFile({ file, base64, mimeType });
      });
    } else {
      setSubjectFile(null);
    }
  }, []);
  
  const handleReferenceFileChange = (index: number, file: File | null) => {
    if (file) {
      fileToBase64(file).then(({ base64, mimeType }) => {
        setReferences(prev => {
          const newRefs = [...prev];
          newRefs[index] = { ...newRefs[index], file: { file, base64, mimeType } };
          return newRefs;
        });
      });
    } else {
      setReferences(prev => {
        const newRefs = [...prev];
        newRefs[index] = { ...newRefs[index], file: null };
        return newRefs;
      });
    }
  };

  const handleReferenceTextChange = (index: number, text: string) => {
    setReferences(prev => {
      const newRefs = [...prev];
      newRefs[index] = { ...newRefs[index], text };
      return newRefs;
    });
  };
  
  // Handlers for manual claim breaking
  const handleClauseChange = (index: number, value: string) => {
    const newClauses = [...claimClauses];
    newClauses[index] = value;
    setClaimClauses(newClauses);
  };

  const handleAddClause = () => {
    setClaimClauses([...claimClauses, '']);
  };

  const handleRemoveClause = (index: number) => {
    if (claimClauses.length > 1) {
      setClaimClauses(claimClauses.filter((_, i) => i !== index));
    }
  };

  const handleStopAnalysis = () => {
    isCancelledRef.current = true;
    setIsLoading(false); // Provide immediate UI feedback
  };

  const handleHistoryItemClick = (item: AnalysisHistory) => {
    setAnalysisResult(item.result);
    setIsHistoryVisible(false);

    // Re-initialize the chat session from the saved data
    const historyForChat = [
        { role: "user", parts: item.userParts },
        { role: "model", parts: [{ text: item.result }] }
    ];
    const newChat = ai.chats.create({
        model: 'gemini-2.5-flash',
        history: historyForChat,
        config: { systemInstruction: SYSTEM_INSTRUCTION_CHAT },
    });
    setChatSession(newChat);
    setMessages([{sender: 'ai', text: "Loaded previous analysis. Ask me anything about it."}]);
    setIsChatVisible(false); // Keep chat hidden initially when loading old result
  };

  const handleCheckCombination = async () => {
    if (subjectPatentOption === 'file' && !isBreakingClaim && claimNumber.trim() === '') {
        setClaimNumberError('Please provide a claim number for analysis.');
        return;
    }
    setClaimNumberError('');

    isCancelledRef.current = false;
    setIsLoading(true);
    setAnalysisResult('');
    setChatSession(null); // Reset chat session on new analysis
    setMessages([]);
    setIsChatVisible(false);
    
    try {
      const parts: HistoryPart[] = [];
      let userPrompt = "Please analyze the provided subject patent and prior art references based on your instructions.\n\n";

      // --- Subject Patent ---
      userPrompt += "--- SUBJECT PATENT ---\n";
      if (isBreakingClaim && claimClauses.some(c => c.trim())) {
        const clausesText = claimClauses.filter(c => c.trim() !== '').map((c, i) => `${i + 1}. ${c.trim()}`).join('\n');
        userPrompt += `The user has MANUALLY BROKEN the claim into the following clauses. YOU MUST use these clauses as the rows for the 'Claim Clause' column in the table, in the exact order provided. Do not parse the claim yourself from any provided file or text. The manually provided clauses are:\n${clausesText}\n\n`;
      }
      
      if (subjectPatentOption === 'file' && subjectFile) {
        userPrompt += `The user has uploaded the subject patent as a file. ${!isBreakingClaim ? `They are specifically interested in analyzing claim(s): ${claimNumber}.` : 'This file is for context.'}\n\n`;
        parts.push({ inlineData: { data: subjectFile.base64, mimeType: subjectFile.mimeType } });
      } else if (subjectPatentOption === 'claim' && subjectClaimText.trim() && !isBreakingClaim) {
        userPrompt += `The user has pasted the following patent claim text: "${subjectClaimText}"\n\n`;
      } else if (subjectPatentOption === 'claim_description') {
        if (subjectClaimText.trim() && !isBreakingClaim) userPrompt += `Patent Claim Text: "${subjectClaimText}"\n`;
        if (subjectDescriptionText.trim()) userPrompt += `Description Text: "${subjectDescriptionText}"\n\n`;
      }
      
      // --- Prior Art References ---
      if (references.length > 0) {
        if (specificInstructions.trim()) {
          userPrompt += `--- SPECIFIC INSTRUCTIONS FOR THIS ANALYSIS ---\n${specificInstructions.trim()}\n\n`;
        }
        userPrompt += "--- PRIOR ART REFERENCES ---\n";
        references.forEach((ref, index) => {
          const refNum = index + 1;
          const hasFile = !!ref.file;
          const hasText = ref.text.trim() !== '';

          let refHeader = `Reference #${refNum}`;

          if (hasFile && hasText) {
            userPrompt += `${refHeader} Content: Provided as both a file and pasted text. Text: "${ref.text}"\n`;
            parts.push({ inlineData: { data: ref.file!.base64, mimeType: ref.file!.mimeType } });
          } else if (hasFile) {
            userPrompt += `${refHeader} Content: Provided as a file.\n`;
            parts.push({ inlineData: { data: ref.file!.base64, mimeType: ref.file!.mimeType } });
          } else if (hasText) {
            userPrompt += `${refHeader} Content: Provided as pasted text: "${ref.text}"\n`;
          }
        });
        userPrompt += "\n";
      }
      
      parts.unshift({ text: userPrompt });

      let finalSystemInstruction = SYSTEM_INSTRUCTION;
      if (priorArtOption === 1) {
        finalSystemInstruction = SYSTEM_INSTRUCTION
            .replace(/combination/g, 'overlap')
            .replace(/Combination/g, 'Overlap')
            .replace(/COMBINATION/g, 'OVERLAP');
      }

      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: { parts: parts },
        config: {
          systemInstruction: finalSystemInstruction,
        },
      });

      let aiResponseText = '';
      for await (const chunk of responseStream) {
        if (isCancelledRef.current) break;
        const chunkText = chunk.text;
        if (chunkText) {
          aiResponseText += chunkText;
        }
      }
      
      if (isCancelledRef.current) {
        setAnalysisResult('Analysis has been cancelled by the user.');
      } else {
        setAnalysisResult(aiResponseText);

        // --- HISTORY SAVING LOGIC ---
        const generateHistoryName = (): string => {
            const subjectName = subjectFile?.file.name ?? (subjectClaimText.trim() ? 'Pasted Claim' : 'Subject Patent');
            const refNames = references
                .map((ref, i) => ref.file?.file.name ?? (ref.text.trim() ? `Pasted Ref ${i+1}` : `Reference ${i+1}`))
                .join(', ');

            if (priorArtOption === 1) {
                return `Overlap: ${subjectName} vs ${refNames}`;
            }
            return `Combination: ${subjectName} vs ${refNames}`;
        };

        const historyName = generateHistoryName();
        const newHistoryEntry: AnalysisHistory = { 
            id: Date.now().toString(), 
            name: historyName, 
            result: aiResponseText,
            userParts: parts,
        };
        
        setHistory(prev => {
            const updatedHistory = [...prev];
            if (updatedHistory.length >= 10) {
                updatedHistory.shift(); // Remove the oldest
            }
            updatedHistory.push(newHistoryEntry);
            return updatedHistory;
        });

        // Initialize chat session after successful analysis
        const historyForChat = [
          { role: "user", parts: parts },
          { role: "model", parts: [{ text: aiResponseText }] }
        ];
        const newChat = ai.chats.create({
          model: 'gemini-2.5-flash',
          history: historyForChat,
          config: { systemInstruction: SYSTEM_INSTRUCTION_CHAT },
        });
        setChatSession(newChat);
        setMessages([{sender: 'ai', text: "The initial analysis is ready. Let me know if you have any questions or want to dive deeper into any of the references."}])
      }

    } catch (error) {
      if (!isCancelledRef.current) {
        console.error("Error calling Gemini API:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        setAnalysisResult(`Sorry, I encountered an error during analysis: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleUnderstandButtonClick = async (isRedo = false) => {
    // If result already exists and it's not a redo, just toggle visibility
    if (understandingResult && !isRedo) {
      setIsUnderstandingVisible(prev => !prev);
      return;
    }
  
    if (subjectPatentOption === 'file' && !isBreakingClaim && claimNumber.trim() === '') {
      setClaimNumberError('Please provide a claim number to understand the patent.');
      return;
    }
    setClaimNumberError('');
  
    setIsUnderstandingLoading(true);
  
    try {
      const parts: any[] = [];
      let userPrompt = "Please analyze the provided subject patent based on your instructions.\n\n";
  
      // --- Subject Patent ---
      userPrompt += "--- SUBJECT PATENT ---\n";

      if (isBreakingClaim && claimClauses.some(c => c.trim())) {
        const clausesText = claimClauses.filter(c => c.trim() !== '').map((c, i) => `${i + 1}. ${c.trim()}`).join('\n');
        userPrompt += `The user has MANUALLY BROKEN the claim into the following clauses. YOU MUST use these clauses as the rows for the 'Claim Clause' column in the table, in the exact order provided. Do not parse the claim yourself from any provided file or text. The manually provided clauses are:\n${clausesText}\n\n`;
      }
      
      if (subjectPatentOption === 'file' && subjectFile) {
        userPrompt += `The user has uploaded the subject patent as a file. ${!isBreakingClaim ? `They are specifically interested in analyzing claim(s): ${claimNumber}.` : 'This file is for context.'}\n\n`;
        parts.push({ inlineData: { data: subjectFile.base64, mimeType: subjectFile.mimeType } });
      } else if (subjectPatentOption === 'claim' && subjectClaimText.trim() && !isBreakingClaim) {
        userPrompt += `The user has pasted the following patent claim text: "${subjectClaimText}"\n\n`;
      } else if (subjectPatentOption === 'claim_description') {
        if (subjectClaimText.trim() && !isBreakingClaim) userPrompt += `Patent Claim Text: "${subjectClaimText}"\n`;
        if (subjectDescriptionText.trim()) userPrompt += `Description Text: "${subjectDescriptionText}"\n\n`;
      }

      if (isRedo) {
        userPrompt += "\n\n--- REDO REQUEST ---\nThe user has requested to run this analysis again. Please be extra cautious, and provide even simpler and more relatable examples in your simplified explanations to ensure maximum clarity.";
      }

      parts.unshift({ text: userPrompt });
  
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: parts },
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_UNDERSTAND,
        },
      });
      
      setUnderstandingResult(response.text);
      setIsUnderstandingVisible(true); // Show after fetching
  
    } catch (error) {
      console.error("Error calling Gemini API for understanding:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      setUnderstandingResult(`Sorry, I encountered an error during analysis: ${errorMessage}`);
      setIsUnderstandingVisible(true); // Show the error too
    } finally {
      setIsUnderstandingLoading(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!chatSession) return;
    
    const newUserMessage: Message = { sender: 'user', text };
    setMessages(prev => [...prev, newUserMessage, { sender: 'ai', text: '' }]);
    setIsChatLoading(true);

    try {
        const responseStream = await chatSession.sendMessageStream({ message: text });
        let fullResponse = '';
        for await (const chunk of responseStream) {
            const chunkText = chunk.text;
            if (chunkText) {
                fullResponse += chunkText;
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].text = fullResponse;
                    return newMessages;
                });
            }
        }
    } catch (error) {
        console.error("Chat error:", error);
        const errorMessage = error instanceof Error ? error.message : "An error occurred.";
        setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].text = `Sorry, an error occurred: ${errorMessage}`;
            return newMessages;
        });
    } finally {
        setIsChatLoading(false);
    }
  };
  
  const isManualClaimProvided = isBreakingClaim && claimClauses.some(c => c.trim() !== '');
  const isPastedClaimProvided = !isBreakingClaim && (
    (subjectPatentOption === 'claim' && subjectClaimText.trim() !== '') ||
    (subjectPatentOption === 'claim_description' && (subjectClaimText.trim() !== '' || subjectDescriptionText.trim() !== ''))
  );
  const isFileProvided = subjectPatentOption === 'file' && subjectFile;
  const isSubjectPatentProvided = isFileProvided || isPastedClaimProvided || isManualClaimProvided;

  const isPriorArtProvided =
    priorArtOption !== null &&
    references.length === priorArtOption &&
    references.every(ref => ref.file || ref.text.trim() !== '');
    
  const isClaimNumberMissing = subjectPatentOption === 'file' && !isBreakingClaim && claimNumber.trim() === '';

  const canSubmit = isSubjectPatentProvided && isPriorArtProvided && !isLoading && !isClaimNumberMissing;
  
  const submitButtonText = (priorArtOption === null || priorArtOption === 1) ? 'Check Overlap' : 'Check for Combination';

  const renderSubjectPatentInput = () => {
    if (!subjectPatentOption) return null;

    const descriptionInput = (
      <div className="form-group">
        <label htmlFor="subject-description">Paste Description</label>
        <textarea
          id="subject-description"
          className="form-control"
          placeholder="Paste the patent description here..."
          value={subjectDescriptionText}
          onChange={e => setSubjectDescriptionText(e.target.value)}
        ></textarea>
      </div>
    );
    
    let standardInputs;
    switch (subjectPatentOption) {
      case 'file':
        standardInputs = (
          <div className="subject-file-wrapper">
            <div className="subject-file-layout">
              <div className="form-group file-input-group">
                <label htmlFor="subject-file-input">Subject Patent File</label>
                <FileInput
                  id="subject-file-input"
                  onFileChange={handleSubjectFileChange}
                  fileName={subjectFile?.file.name}
                />
              </div>
              {!isBreakingClaim && (
                <div className="form-group claim-number-group">
                  <label htmlFor="claim-number">
                    Claim Number(s)
                    <span className="required-star"> *</span>
                  </label>
                  <input
                    type="text"
                    id="claim-number"
                    className={`form-control ${claimNumberError ? 'is-invalid' : ''}`}
                    placeholder="e.g., '1-5'"
                    value={claimNumber}
                    onChange={e => {
                      setClaimNumber(e.target.value);
                      if (e.target.value.trim() !== '') {
                        setClaimNumberError('');
                      }
                    }}
                    aria-required="true"
                    aria-describedby={claimNumberError ? 'claim-number-error' : undefined}
                  />
                </div>
              )}
            </div>
            {!isBreakingClaim && claimNumberError && <p id="claim-number-error" className="error-message">{claimNumberError}</p>}
          </div>
        );
        break;
      case 'claim':
        standardInputs = !isBreakingClaim && (
          <div className="form-group">
            <label htmlFor="subject-claim">Paste Claim in Focus</label>
            <textarea
              id="subject-claim"
              className="form-control"
              placeholder="Paste the patent claim here..."
              value={subjectClaimText}
              onChange={e => setSubjectClaimText(e.target.value)}
            ></textarea>
          </div>
        );
        break;
      case 'claim_description':
        standardInputs = (
          <>
            {!isBreakingClaim && (
              <div className="form-group">
                <label htmlFor="subject-claim-desc">Paste Claim in Focus</label>
                <textarea
                  id="subject-claim-desc"
                  className="form-control"
                  placeholder="Paste the patent claim here..."
                  value={subjectClaimText}
                  onChange={e => setSubjectClaimText(e.target.value)}
                ></textarea>
              </div>
            )}
            {!isBreakingClaim && descriptionInput}
          </>
        );
        break;
      default:
        standardInputs = null;
    }
    
    const claimBreakerInputs = isBreakingClaim && (
      <div className="claim-clauses-container form-group">
        <label>Claim Clauses</label>
        <p className="field-description">Enter each distinct clause of the patent claim in a separate box.</p>
        {claimClauses.map((clause, index) => (
          <div key={index} className="clause-input-wrapper">
            <textarea
              className="form-control"
              placeholder={`Clause ${index + 1}`}
              value={clause}
              onChange={(e) => handleClauseChange(index, e.target.value)}
              rows={1}
            />
            {claimClauses.length > 1 && (
              <button
                type="button"
                className="remove-clause-btn"
                onClick={() => handleRemoveClause(index)}
                aria-label={`Remove clause ${index + 1}`}
                title="Remove clause"
              >
                &times;
              </button>
            )}
          </div>
        ))}
        <button type="button" className="add-clause-btn" onClick={handleAddClause}>
          + Add Clause
        </button>
      </div>
    );
    
    const isUnderstandButtonInHideMode = understandingResult && isUnderstandingVisible;
    const understandButtonText = isUnderstandingLoading
      ? "Analyzing..."
      : isUnderstandButtonInHideMode
      ? "Hide Understanding"
      : "Understand Patent";

    return (
        <div className="input-area">
            {isBreakingClaim && subjectPatentOption === 'claim_description' && descriptionInput}
            {isBreakingClaim && subjectPatentOption === 'file' && standardInputs}

            {claimBreakerInputs}

            {/* Render standardInputs if not breaking claim, OR if breaking but it's not the file option (which was handled above) */}
            {(!isBreakingClaim || (isBreakingClaim && subjectPatentOption !== 'file')) && standardInputs}
            
            <div className="subsection-actions">
                <button
                    type="button"
                    onClick={() => setIsBreakingClaim(prev => !prev)}
                    className="secondary-action-btn"
                >
                    {isBreakingClaim ? 'Cancel Manual Break' : 'Break Claim Manually'}
                </button>
                <button
                    type="button"
                    onClick={() => setIsAddingInstructions(prev => !prev)}
                    className="secondary-action-btn"
                >
                    {isAddingInstructions ? 'Remove Instructions' : 'Specific Instructions'}
                </button>
            </div>
            
            {isAddingInstructions && (
              <div className="form-group">
                <label htmlFor="specific-instructions">Specific Instructions</label>
                <textarea
                  id="specific-instructions"
                  className="form-control"
                  placeholder="e.g., Focus only on embodiments related to wireless communication."
                  value={specificInstructions}
                  onChange={e => setSpecificInstructions(e.target.value)}
                  rows={3}
                ></textarea>
              </div>
            )}
            
            {isSubjectPatentProvided && (
                <div className="understand-btn-container">
                    <button
                        className={`understand-btn ${isUnderstandButtonInHideMode ? 'hide-mode' : ''}`}
                        onClick={() => handleUnderstandButtonClick()}
                        disabled={isUnderstandingLoading || (!understandingResult && subjectPatentOption === 'file' && !isBreakingClaim && claimNumber.trim() === '')}
                    >
                        {isUnderstandingLoading ? (
                            <>
                                <div className="spinner"></div>
                                <span>{understandButtonText}</span>
                            </>
                        ) : (
                            understandButtonText
                        )}
                    </button>
                    {isUnderstandButtonInHideMode && (
                      <button
                        className="understand-btn redo-btn"
                        onClick={() => handleUnderstandButtonClick(true)}
                        disabled={isUnderstandingLoading}
                        title="Redo analysis with simpler examples"
                      >
                        {isUnderstandingLoading ? (
                          <div className="spinner"></div>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                            <span>Redo</span>
                          </>
                        )}
                      </button>
                    )}
                </div>
            )}
        </div>
    );
  };
  
  const renderPriorArtInputs = () => {
    if (!priorArtOption) return null;
    return (
        <div className="references-container">
          {Array.from({ length: priorArtOption }, (_, i) => (
            <ReferenceColumn 
                key={i} 
                referenceNumber={i + 1}
                reference={references[i] || { file: null, text: '' }}
                onFileChange={(file) => handleReferenceFileChange(i, file)}
                onTextChange={(text) => handleReferenceTextChange(i, text)}
            />
          ))}
        </div>
    );
  };

  return (
    <>
      <main className="main-container">
        <header>
          <div className="header-actions-left">
            <ThemeToggle theme={theme} onToggle={handleThemeToggle} />
          </div>
          <div className="header-actions">
            <button
              className={`history-toggle-btn ${isHistoryVisible ? 'active' : ''}`}
              onClick={() => setIsHistoryVisible(prev => !prev)}
              disabled={history.length === 0}
              aria-controls="history-panel"
              aria-expanded={isHistoryVisible}
              aria-label={`View analysis history (${history.length} items)`}
              title="Analysis History"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l4 2"></path></svg>
              <span>({history.length})</span>
            </button>
          </div>
          <svg className="app-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path>
          </svg>
          <h1>Nexus</h1>
          <p>
            Your AI-powered assistant for analyzing prior-art and their combinations.
          </p>
        </header>

        {isHistoryVisible && (
          <section id="history-panel" className="card history-panel" role="region" aria-labelledby="history-heading">
            <h2 id="history-heading">Analysis History</h2>
            {history.length > 0 ? (
              <ul className="history-list">
                {[...history].reverse().map(item => (
                  <li key={item.id} className="history-item">
                    <button onClick={() => handleHistoryItemClick(item)} title={item.name}>
                      {item.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No analysis history for this session yet.</p>
            )}
          </section>
        )}

        <section className="card" aria-labelledby="subject-patent-heading">
          <h2 id="subject-patent-heading">1. Provide Subject Patent</h2>
          <div className="option-selector" role="radiogroup" aria-labelledby="subject-patent-heading">
            {subjectOptions.map(({ key, label }, index) => (
              <Fragment key={key}>
                <button
                  onClick={() => setSubjectPatentOption(prev => prev === key ? null : key)}
                  className={`option-btn ${subjectPatentOption === key ? 'selected' : ''}`}
                  role="radio"
                  aria-checked={subjectPatentOption === key}
                >
                  {label}
                </button>
                {index < subjectOptions.length - 1 && <div className="or-text">OR</div>}
              </Fragment>
            ))}
          </div>
          {renderSubjectPatentInput()}
        </section>

        {(isUnderstandingLoading || (understandingResult && isUnderstandingVisible)) && (
          <section className="card result-card understanding-section" aria-labelledby="understanding-heading" aria-live="polite">
            {isUnderstandingLoading ? (
              <div className="inline-loading-container">
                <div className="spinner"></div>
                <p>Analyzing patent...</p>
              </div>
            ) : (
              <>
                <h2 id="understanding-heading">Patent Analysis</h2>
                <UnderstandingDisplay content={understandingResult} />
              </>
            )}
          </section>
        )}

        <section className="card" aria-labelledby="prior-art-heading">
          <h2 id="prior-art-heading">2. Provide Prior Art References</h2>
          <div className="option-selector" role="radiogroup" aria-labelledby="prior-art-heading">
            {priorArtOptions.map(({ key, label }, index) => (
              <Fragment key={key}>
                  <button
                    onClick={() => setPriorArtOption(prev => prev === key ? null : key)}
                    className={`option-btn ${priorArtOption === key ? 'selected' : ''}`}
                    role="radio"
                    aria-checked={priorArtOption === key}
                  >
                    {label}
                  </button>
                  {index < priorArtOptions.length - 1 && <div className="or-text">OR</div>}
              </Fragment>
            ))}
          </div>
          {renderPriorArtInputs()}
        </section>

        <footer className="action-footer">
            <button
                className={`submit-btn ${isLoading ? 'stop-btn' : ''}`}
                onClick={isLoading ? handleStopAnalysis : handleCheckCombination}
                disabled={!isLoading && !canSubmit}
                aria-live="polite"
            >
              {isLoading ? (
                <>
                  <div className="spinner"></div>
                  <span className="timer-text">Stop Analysis ({formatTime(elapsedTime)})</span>
                </>
              ) : (
                submitButtonText
              )}
            </button>
        </footer>
      </main>

      {analysisResult && (
        <main className="main-container">
          <ResultDisplay content={analysisResult} />
           <div ref={chatSectionRef}>
              {isChatVisible && (
                <ChatWindow
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  isLoading={isChatLoading}
                  onHide={() => setIsChatVisible(false)}
                  height={chatHeight}
                  setHeight={setChatHeight}
                />
              )}
          </div>
        </main>
      )}

      {analysisResult && !isChatVisible && (
        <button className="chat-start-btn-floating" onClick={() => setIsChatVisible(true)}>
            doubts?
        </button>
      )}

    </>
  );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
