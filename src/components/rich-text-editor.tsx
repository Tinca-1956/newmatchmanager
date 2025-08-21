'use client';

import * as React from 'react';
import { Bold, Italic, Underline, Link as LinkIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder,
  className,
  id,
}) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const applyFormat = (format: 'bold' | 'italic' | 'underline' | 'link') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);

    let replacement;
    switch (format) {
      case 'bold':
        replacement = `<b>${selectedText}</b>`;
        break;
      case 'italic':
        replacement = `<i>${selectedText}</i>`;
        break;
      case 'underline':
        replacement = `<u>${selectedText}</u>`;
        break;
      case 'link':
        const url = prompt('Enter the URL:', 'https://');
        if (url) {
          replacement = `<a href="${url}" target="_blank" rel="noopener noreferrer">${selectedText || url}</a>`;
        } else {
          return;
        }
        break;
    }

    const newValue = 
      textarea.value.substring(0, start) + 
      replacement + 
      textarea.value.substring(end);
      
    onChange(newValue);
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2 border-b pb-2 mb-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => applyFormat('bold')}
          aria-label="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => applyFormat('italic')}
          aria-label="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => applyFormat('underline')}
          aria-label="Underline"
        >
          <Underline className="h-4 w-4" />
        </Button>
         <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => applyFormat('link')}
          aria-label="Insert Link"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
      </div>
      <Textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[300px]"
      />
      <p className="text-xs text-muted-foreground mt-2">
        Select text and use the buttons to format. You can also manually add other HTML tags (e.g., &lt;h3&gt;, &lt;ul&gt;, &lt;li&gt;).
      </p>
    </div>
  );
};
