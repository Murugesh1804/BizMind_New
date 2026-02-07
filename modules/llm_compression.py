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
            
            # Split text into chunks to avoid exceeding model's max sequence length (512 tokens)
            # We use ~400 tokens per chunk to be safe
            words = text.split()
            chunk_size = 400  # Conservative limit to stay under 512 tokens
            chunks = []
            
            for i in range(0, len(words), chunk_size):
                chunk = ' '.join(words[i:i + chunk_size])
                chunks.append(chunk)
            
            print(f"[LLMLingua] Split into {len(chunks)} chunks for processing")
            
            # Compress each chunk separately
            compressed_chunks = []
            total_original_tokens = 0
            total_compressed_tokens = 0
            
            for idx, chunk in enumerate(chunks):
                try:
                    compressed_result = self.compressor.compress_prompt(
                        chunk,
                        rate=target_ratio,
                        force_tokens=['\n', '.', '!', '?', ',']  # Preserve important punctuation
                    )
                    
                    compressed_text = compressed_result['compressed_prompt']
                    compressed_chunks.append(compressed_text)
                    
                    original_tokens = len(chunk.split())
                    compressed_tokens = len(compressed_text.split())
                    total_original_tokens += original_tokens
                    total_compressed_tokens += compressed_tokens
                    
                    print(f"[LLMLingua] Chunk {idx + 1}/{len(chunks)}: {original_tokens} → {compressed_tokens} tokens")
                    
                except Exception as chunk_error:
                    print(f"[LLMLingua] Chunk {idx + 1} failed: {str(chunk_error)}, using original")
                    compressed_chunks.append(chunk)
                    total_original_tokens += len(chunk.split())
                    total_compressed_tokens += len(chunk.split())
            
            # Combine compressed chunks
            final_compressed = ' '.join(compressed_chunks)
            
            reduction = ((total_original_tokens - total_compressed_tokens) / total_original_tokens) * 100 if total_original_tokens > 0 else 0
            
            print(f"[LLMLingua] Total Compressed: {total_original_tokens} → {total_compressed_tokens} tokens ({reduction:.1f}% reduction)")
            
            return final_compressed
            
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
