
'use client';

import * as React from 'react';
import { Bold, Italic, Underline, Link as LinkIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from './ui/input';

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
  const [isLinkDialogOpen, setIsLinkDialogOpen] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState('https://');
  const [selection, setSelection] = React.useState<{ start: number; end: number } | null>(null);

  const applyFormat = (format: 'bold' | 'italic' | 'underline') => {
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
    }

    const newValue =
      textarea.value.substring(0, start) +
      replacement +
      textarea.value.substring(end);
      
    onChange(newValue);
  };
  
  const openLinkDialog = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    setSelection({ start: textarea.selectionStart, end: textarea.selectionEnd });
    setIsLinkDialogOpen(true);
  };
  
  const handleAddLink = () => {
    const textarea = textareaRef.current;
    if (!textarea || !selection || !linkUrl) return;

    const selectedText = textarea.value.substring(selection.start, selection.end);
    const replacement = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${selectedText || linkUrl}</a>`;

    const newValue =
      textarea.value.substring(0, selection.start) +
      replacement +
      textarea.value.substring(selection.end);

    onChange(newValue);
    setIsLinkDialogOpen(false);
    setLinkUrl('https://');
    setSelection(null);
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
          onClick={openLinkDialog}
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

      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Insert Hyperlink</DialogTitle>
            </DialogHeader>
            <div className="py-4">
                <Label htmlFor="link-url">URL</Label>
                <Input
                    id="link-url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                />
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsLinkDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddLink}>Add Link</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
