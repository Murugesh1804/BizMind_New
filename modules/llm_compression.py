"""
LLMLingua Compression Module

This module uses LLMLingua to compress review texts and prompts
to reduce token count before sending to LLM APIs.

LLMLingua can reduce tokens by 50-70% while preserving key information.
"""

try:
    from llmlingua import PromptCompressor
    LLMLINGUA_AVAILABLE = True
except ImportError:
    print("[WARNING] LLMLingua not available. Install with: pip install llmlingua")
    LLMLINGUA_AVAILABLE = False


class LLMLinguaCompressor:
    """
    Token compression using LLMLingua
    """
    
    def __init__(self):
        """
        Initialize the LLMLingua compressor
        """
        self.compressor = None
        
        if LLMLINGUA_AVAILABLE:
            try:
                print("[LLMLingua] Initializing compressor (this may take a moment)...")
                # Initialize with small model for faster loading
                self.compressor = PromptCompressor(
                    model_name="microsoft/llmlingua-2-bert-base-multilingual-cased-meetingbank",
                    use_llmlingua2=True,
                    device_map="cpu"
                )
                print("[LLMLingua] Compressor initialized successfully")
            except Exception as e:
                print(f"[LLMLingua] Failed to initialize: {str(e)}")
                print("[LLMLingua] Falling back to simple compression")
                self.compressor = None
        else:
            print("[LLMLingua] Using fallback compression (install llmlingua for better results)")
    
    def compress_reviews(self, reviews, target_ratio=0.5):
        """
        Compress review texts to reduce token count
        
        Args:
            reviews (list): List of review text strings
            target_ratio (float): Target compression ratio (0.5 = 50% reduction)
            
        Returns:
            str: Compressed review text
        """
        if not reviews:
            return ""
        
        # Combine all reviews
        combined_text = "\n".join([f"- {review}" for review in reviews if review])
        
        if not combined_text:
            return ""
        
        # Use LLMLingua if available, otherwise use simple compression
        if self.compressor:
            return self._compress_with_llmlingua(combined_text, target_ratio)
        else:
            return self._simple_compression(combined_text, target_ratio)
    
    def _compress_with_llmlingua(self, text, target_ratio):
        """
        Compress text using LLMLingua
        
        Args:
            text (str): Text to compress
            target_ratio (float): Target compression ratio
            
        Returns:
            str: Compressed text
        """
        try:
            print(f"[LLMLingua] Compressing {len(text)} characters...")
            
            # Compress the text
            compressed_result = self.compressor.compress_prompt(
                text,
                rate=target_ratio,
                force_tokens=['\n', '.', '!', '?', ',']  # Preserve important punctuation
            )
            
            compressed_text = compressed_result['compressed_prompt']
            
            original_tokens = len(text.split())
            compressed_tokens = len(compressed_text.split())
            reduction = ((original_tokens - compressed_tokens) / original_tokens) * 100
            
            print(f"[LLMLingua] Compressed: {original_tokens} → {compressed_tokens} tokens ({reduction:.1f}% reduction)")
            
            return compressed_text
            
        except Exception as e:
            print(f"[LLMLingua] Compression failed: {str(e)}")
            print("[LLMLingua] Falling back to simple compression")
            return self._simple_compression(text, target_ratio)
    
    def _simple_compression(self, text, target_ratio):
        """
        Simple fallback compression (truncation + summarization)
        
        Args:
            text (str): Text to compress
            target_ratio (float): Target compression ratio
            
        Returns:
            str: Compressed text
        """
        # Split into sentences
        sentences = text.split('.')
        
        # Calculate target sentence count
        target_count = max(1, int(len(sentences) * target_ratio))
        
        # Take first N sentences (simple but effective)
        compressed = '. '.join(sentences[:target_count])
        
        print(f"[Compression] Simple compression: {len(sentences)} → {target_count} sentences")
        
        return compressed
    
    def compress_prompt(self, prompt, target_ratio=0.6):
        """
        Compress a prompt while preserving structure
        
        Args:
            prompt (str): Prompt to compress
            target_ratio (float): Target compression ratio
            
        Returns:
            str: Compressed prompt
        """
        if self.compressor:
            return self._compress_with_llmlingua(prompt, target_ratio)
        else:
            # For prompts, we don't compress as aggressively
            return prompt
