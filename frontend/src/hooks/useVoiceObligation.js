import { useState, useRef } from 'react';
import { useVoiceIO } from './useVoiceIO';

function parseAmountFromSpeech(text) {
  if (!text) return null;
  const cleaned = text.toLowerCase().trim();

  const digitMatch = cleaned.match(/\d+(\.\d{1,2})?/);
  if (digitMatch) return parseFloat(digitMatch[0]);

  const wordNumbers = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    fifteen: 15, twenty: 20, twentyfive: 25, thirty: 30, fifty: 50, sixty: 60, seventy: 70,
    eighty: 80, ninety: 90, hundred: 100, twohundred: 200, fivehundred: 500, thousand: 1000
  };

  const words = cleaned.replace(/[^a-z]/g, ' ').split(/\s+/);
  for (const word of words) {
    if (wordNumbers[word] !== undefined) {
      return wordNumbers[word];
    }
  }

  return null;
}

export function useVoiceObligation(onExtracted) {
  const { isListening, transcript, startListening, stopListening, speak, isSpeaking, stopSpeaking } = useVoiceIO();
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const pendingObligationRef = useRef(null);
  const awaitingAmountRef = useRef(false);

  const handleStartVoice = () => {
    setStatusMessage('Listening...');
    awaitingAmountRef.current = false;
    pendingObligationRef.current = null;
    startListening();
  };

  const processTranscript = async (rawTranscript) => {
    if (!rawTranscript || !rawTranscript.trim()) {
      setStatusMessage('');
      return;
    }

    if (awaitingAmountRef.current && pendingObligationRef.current) {
      const parsedAmount = parseAmountFromSpeech(rawTranscript);
      awaitingAmountRef.current = false;

      if (parsedAmount !== null && parsedAmount > 0) {
        const completedForm = {
          ...pendingObligationRef.current,
          expected_amount: parsedAmount.toString(),
        };
        pendingObligationRef.current = null;
        setStatusMessage('Amount received!');
        
        // Confirmation Voice Prompt
        speak(`Got it, ${parsedAmount}. Please check the details and confirm.  Click the save item button.`);
        if (onExtracted) onExtracted(completedForm);
      } else {
        setStatusMessage('Could not detect amount. Please type it in.');
        speak("I couldn't catch the amount. Please enter it manually.");
        if (onExtracted) onExtracted(pendingObligationRef.current);
        pendingObligationRef.current = null;
      }
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Analyzing prompt...');

    try {
      const response = await fetch('/api/parse-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: rawTranscript }),
      });

      if (!response.ok) throw new Error('Failed to parse voice prompt');

      const data = await response.json();

      if (!data.is_obligation) {
        const rejectionMsg = data.rejection_reason || "I handle bills and reminders. Try 'Water bill $40 due on the 10th'.";
        setStatusMessage(rejectionMsg);
        speak(rejectionMsg);
        setIsProcessing(false);
        return;
      }

      const extractedForm = {
        name: data.name || '',
        type: data.type === 'event' ? 'event' : 'bill',
        category: data.category || (data.type === 'event' ? 'Events' : 'Bills'),
        expected_amount: data.expected_amount ? data.expected_amount.toString() : '',
        due_month: data.due_month || (new Date().getMonth() + 1),
        due_day: data.due_day || new Date().getDate(),
        frequency: data.frequency || (data.type === 'event' ? 'yearly' : 'monthly'),
      };

      if (extractedForm.type === 'bill' && (!extractedForm.expected_amount || Number(extractedForm.expected_amount) <= 0)) {
        pendingObligationRef.current = extractedForm;
        awaitingAmountRef.current = true;

        const promptText = `What is the amount for ${extractedForm.name || 'this bill'}?`;
        setStatusMessage(promptText);
        speak(promptText);

        setTimeout(() => {
          startListening();
        }, 1800);
      } else {
        setStatusMessage('Form auto-filled! Please confirm details.');
        
        // Confirmation Voice Prompt
        speak(`Added ${extractedForm.name || 'obligation'}. Please check the details and click Save Item button.`);
        
        if (onExtracted) onExtracted(extractedForm);
      }
    } catch (error) {
      console.error('Error processing voice obligation:', error);
      setStatusMessage('Failed to analyze voice input.');
      speak("Sorry, I had trouble processing that.");
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isListening,
    isProcessing,
    isSpeaking,
    transcript,
    statusMessage,
    startVoice: handleStartVoice,
    stopVoice: stopListening,
    processTranscript,
    speak,
    stopSpeaking,
  };
}