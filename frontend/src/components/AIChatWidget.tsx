import React, { useState, useRef, useEffect } from 'react';
import { aiApi } from '../services/api';
import type { AIChatMessage } from '../types';
import './AIChatWidget.css';

function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: AIChatMessage = {
      role: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await aiApi.chat({
        messages: [...messages, userMessage]
      });

      const assistantMessage: AIChatMessage = {
        role: 'assistant',
        content: response.response
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setError(err.response?.data?.error || 'Failed to get AI response');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        className={`ai-chat-button ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="AI Assistant"
      >
        <span className="ai-icon">🤖</span>
        {!isOpen && <span className="ai-label">Ask AI</span>}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="ai-chat-widget">
          <div className="chat-header">
            <div className="header-content">
              <span className="header-icon">🤖</span>
              <div className="header-text">
                <h3>AI Assistant</h3>
                <p>Powered by GPT-5 Nano</p>
              </div>
            </div>
            <div className="header-actions">
              {messages.length > 0 && (
                <button
                  className="clear-btn"
                  onClick={clearChat}
                  title="Clear chat"
                >
                  🗑️
                </button>
              )}
              <button
                className="close-btn"
                onClick={() => setIsOpen(false)}
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="welcome-message">
                <div className="welcome-icon">👋</div>
                <h4>Hi! I'm your AI assistant</h4>
                <p>Ask me anything about product prices, trends, or insights!</p>
                <div className="example-questions">
                  <p className="example-label">Try asking:</p>
                  <button className="example-btn" onClick={() => setInput("What are the current price trends?")}>
                    "What are the current price trends?"
                  </button>
                  <button className="example-btn" onClick={() => setInput("Which retailer has the best prices?")}>
                    "Which retailer has the best prices?"
                  </button>
                  <button className="example-btn" onClick={() => setInput("Should I buy now or wait?")}>
                    "Should I buy now or wait?"
                  </button>
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
              >
                <div className="message-avatar">
                  {message.role === 'user' ? '👤' : '🤖'}
                </div>
                <div className="message-content">
                  <div className="message-text">{message.content}</div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="message assistant-message">
                <div className="message-avatar">🤖</div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="chat-error">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything..."
              disabled={loading}
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="send-btn"
            >
              {loading ? '⏳' : '🚀'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default AIChatWidget;
