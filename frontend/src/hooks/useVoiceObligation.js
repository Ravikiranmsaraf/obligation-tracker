import { useState, useRef } from 'react';
import { useVoiceIO } from './useVoiceIO';
import { STANDARD_CATEGORIES } from '../constants/categories';

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
        
        speak(`Got it, ${parsedAmount}. Please check the details and confirm. Click the save item button.`);
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
        body: JSON.stringify({ 
          transcript: rawTranscript,
          valid_categories: STANDARD_CATEGORIES 
        }),
      });

      if (!response.ok) throw new Error('Failed to parse voice prompt');

      const data = await response.json();
      const lowerTranscript = rawTranscript.toLowerCase();
      const isReminderKeyword = lowerTranscript.includes('remind') || lowerTranscript.includes('bring') || lowerTranscript.includes('buy') || lowerTranscript.includes('pick up');

      // Accept prompt if marked as obligation or matching reminder phrases
      if (!data.is_obligation && !isReminderKeyword) {
        const rejectionMsg = data.rejection_reason || "I handle bills and reminders. Try 'Remind me to bring milk tomorrow 7am'.";
        setStatusMessage(rejectionMsg);
        speak(rejectionMsg);
        setIsProcessing(false);
        return;
      }

      // Match category against STANDARD_CATEGORIES
      let matchedCategory = STANDARD_CATEGORIES.includes(data.category) ? data.category : 'Other';
      if (matchedCategory === 'Other') {
        const found = STANDARD_CATEGORIES.find((cat) => lowerTranscript.includes(cat.toLowerCase()));
        if (found) {
          matchedCategory = found;
        } else if (lowerTranscript.includes('milk') || lowerTranscript.includes('doc') || lowerTranscript.includes('appointment')) {
          matchedCategory = STANDARD_CATEGORIES.includes('Personal') ? 'Personal' : STANDARD_CATEGORIES[0] || 'Other';
        }
      }

      // Extract time cleanly or parse fallback
      let parsedTime = data.due_time || data.reminder_time;
      if (!parsedTime || parsedTime === '09:00') {
        const timeMatch = lowerTranscript.match(/(\d{1,2})\s*(am|pm)/i);
        if (timeMatch) {
          let hour = parseInt(timeMatch[1], 10);
          const period = timeMatch[2].toLowerCase();
          if (period === 'pm' && hour < 12) hour += 12;
          if (period === 'am' && hour === 12) hour = 0;
          parsedTime = `${String(hour).padStart(2, '0')}:00`;
        } else {
          parsedTime = '09:00';
        }
      }

      // Date Parsing & Fallbacks
      const now = new Date();
      let calculatedDay = data.due_day;
      let calculatedMonth = data.due_month;
      let calculatedFrequency = data.frequency;

      if (lowerTranscript.includes('today') || lowerTranscript.includes('this evening') || lowerTranscript.includes('tonight')) {
        calculatedDay = now.getDate();
        calculatedMonth = now.getMonth() + 1;
        calculatedFrequency = 'one-off';
      } else if (lowerTranscript.includes('tomorrow')) {
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        calculatedDay = tomorrow.getDate();
        calculatedMonth = tomorrow.getMonth() + 1;
        calculatedFrequency = 'one-off';
      }

      const isYearly = calculatedFrequency === 'yearly' || data.frequency === 'yearly' || lowerTranscript.includes('annual') || lowerTranscript.includes('yearly');
      const isEventItem = data.type === 'event' || isReminderKeyword || (!data.expected_amount && data.type !== 'bill');

      // Extract title fallback for generic reminder phrases
      let extractedName = data.name || '';
      if (!extractedName && lowerTranscript.includes('remind me to')) {
        extractedName = rawTranscript.split(/remind me to/i)[1]?.split(/tomorrow|today|at/i)[0]?.trim();
      }

      const extractedForm = {
        name: extractedName || rawTranscript,
        type: isEventItem ? 'event' : 'bill',
        category: matchedCategory,
        expected_amount: isEventItem ? '' : (data.expected_amount ? data.expected_amount.toString() : ''),
        due_month: calculatedMonth || data.due_month || (now.getMonth() + 1),
        due_day: calculatedDay || data.due_day || now.getDate(),
        frequency: isYearly ? 'yearly' : (calculatedFrequency || (isEventItem ? 'one-off' : 'monthly')),
        due_time: parsedTime,
        reminder_time: parsedTime,
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