/**
 * Robust helper to copy text to clipboard.
 * Supports both modern secure contexts (navigator.clipboard)
 * and legacy insecure contexts (document.execCommand via temporary textarea).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // Use the modern API if available and context is secure
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Modern clipboard API failed, falling back to legacy execution:', err);
    }
  }

  // Fallback: Legacy method using temporary textarea
  const textArea = document.createElement('textarea');
  textArea.value = text;
  
  // Place it off-screen and make it read-only
  textArea.style.position = 'fixed';
  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.width = '2em';
  textArea.style.height = '2em';
  textArea.style.padding = '0';
  textArea.style.border = 'none';
  textArea.style.outline = 'none';
  textArea.style.boxShadow = 'none';
  textArea.style.background = 'transparent';
  textArea.style.opacity = '0';
  textArea.setAttribute('readonly', 'readonly');
  
  document.body.appendChild(textArea);
  textArea.select();
  textArea.setSelectionRange(0, 99999); // Mobile compatibility

  try {
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback clipboard copy failed:', err);
    document.body.removeChild(textArea);
    return false;
  }
}
