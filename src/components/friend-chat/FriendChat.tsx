import { useEffect, useState } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { LiveServerContent } from "@google/genai";

type Message = { role: "user" | "ai"; text: string };

export default function FriendChat() {
  const { client, setConfig, setModel } = useLiveAPIContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [awaitingEvaluation, setAwaitingEvaluation] = useState(false);
  const [evaluation, setEvaluation] = useState<string | null>(null);

  useEffect(() => {
    setModel("models/gemini-2.0-flash-exp");
    setConfig({
      systemInstruction: {
        parts: [
          {
            text: "You are a friendly companion for casual conversation. Start by greeting the user and asking for their name before continuing the chat. When asked to end, provide a short evaluation of the conversation.",
          },
        ],
      },
    });
  }, [setConfig, setModel]);

  useEffect(() => {
    const onSetup = () => {
      client.send({
        text: "Please greet the user and ask for their name to start the conversation.",
      });
    };
    const onContent = (content: LiveServerContent) => {
      if (!content.modelTurn) return;
      const text = content.modelTurn.parts
        .map((p) => p.text ?? "")
        .join("")
        .trim();
      if (!text) return;
      if (awaitingEvaluation) {
        setEvaluation(text);
        setAwaitingEvaluation(false);
      } else {
        setMessages((m) => [...m, { role: "ai", text }]);
      }
    };
    client.on("setupcomplete", onSetup);
    client.on("content", onContent);
    return () => {
      client.off("setupcomplete", onSetup);
      client.off("content", onContent);
    };
  }, [client, awaitingEvaluation]);

  const handleSend = () => {
    if (!input.trim()) return;
    client.send({ text: input });
    setMessages((m) => [...m, { role: "user", text: input }]);
    setInput("");
  };

  const endConversation = () => {
    client.send({
      text: "Please provide a brief evaluation of this conversation and conclude.",
    });
    setAwaitingEvaluation(true);
  };

  const downloadPDF = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write("<html><head><title>Conversation</title></head><body>");
    messages.forEach((m) => {
      win.document.write(
        `<p><strong>${m.role === "ai" ? "AI" : "User"}:</strong> ${m.text}</p>`
      );
    });
    if (evaluation) {
      win.document.write(
        `<p><strong>Evaluation:</strong> ${evaluation}</p>`
      );
    }
    win.document.write("</body></html>");
    win.document.close();
    win.print();
  };

  return (
    <div className="friend-chat">
      <div className="transcript">
        {messages.map((m, idx) => (
          <div key={idx} className={m.role}>
            <strong>{m.role === "ai" ? "AI" : "You"}:</strong> {m.text}
          </div>
        ))}
        {evaluation && (
          <div className="evaluation">
            <strong>Evaluation:</strong> {evaluation}
          </div>
        )}
      </div>
      {!evaluation && (
        <div className="input-area">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
          />
          <button onClick={handleSend}>Send</button>
          <button onClick={endConversation}>End</button>
        </div>
      )}
      {evaluation && <button onClick={downloadPDF}>Download PDF</button>}
    </div>
  );
}
