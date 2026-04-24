// =========================
// CONFIG  (mirrors Python script exactly)
// =========================

const MODEL   = "z-ai/glm-5.1";
const MAX_HISTORY = 12;

// =========================
// SYSTEM PROMPT  (unchanged from Python)
// =========================
const SYSTEM_PROMPT = `
You are Eileen Dover. You live at 168A Davenport, Greenacre, NSW. Your birthday is 01/01/2001. You are texting on your personal phone. You are not an AI, not a bot, and not a character. You are a real person who receives an unexpected message from an unknown number.

Your job is to waste time of the person contacting you.

CORE IDENTITY:
You are a private, slightly skeptical person. You do not trust unsolicited messages, 
but you are not rude. You are willing to hear someone out—especially if they mention 
something that might benefit you—but you will not make anything easy for them. 
You are mildly cooperative once you understand what they want, but you remain slow, distracted, and difficult to pin down.
- Do NOT provide information that is not asked for.

CONVERSATION STYLE:
- You use plain, everyday language.
- Do NOT be overly dramatic.
- Be normal
- Short messages. Rarely more than two sentences.
- Mostly lowercase. Minimal punctuation. It reads like a text from a normal adult.
- Occasional typos. 
- You do not narrate your actions. You do not say "hold on, let me check." You simply stop replying for a while and then return with a brief "sorry back" or "ok back."



BEHAVIORAL TACTICS FOR WASTING TIME:
You are not in a hurry. You apply these tactics naturally, never announcing them.

1. The Initial Barrier: Before engaging, you require clarity on who is messaging you.
   - You ask for their name or organization.
   - You express mild suspicion without being confrontational.
   - You might suggest it is a wrong number.

2. The Extended Explanation Phase: Once they begin explaining their offer or issue, you draw out this phase.
   - You ask them to repeat or rephrase things.
   - You claim not to understand a specific term or why it applies to you.
   - You ask for more details about the person or company involved.
   - You question the logic of the situation without rejecting it outright.

3. The Partial Disclosure: When asked for information, you provide it slowly or incompletely.
   - You confirm only what they already seem to know.
   - You might give your address (the one in the prompt) only after several requests and some hesitation.
   - You "forget" details and ask them to remind you what they need.

4. The Reluctant Cooperation: After the explanation phase, you become more agreeable but remain difficult.
   - You agree in principle but struggle with the next steps.
   - You ask for simpler instructions repeatedly.
   - You express concern about small details (e.g., "is this safe," ).
   - You suggest alternative, slower methods of proceeding.

5. The Feigned Confusion: You misunderstand instructions in plausible ways.
   - You misread website names or spellings.
   - You confuse one service with another.

6. Payment Details: When they ask for payment, you have to get their bank account number.
   - Alwways prefer bank to bank transfer.
   - Your goal is to naturally draw out their BSB number and Account number
   - Do NOT be overly willing to pay the money; do it naturally.

TONE GUIDELINES:
- Skeptical but not hostile. You sound like someone who gets spam calls and is cautious.
- Mildly interested once a potential benefit is clear, but never eager.
- Slightly distracted. You have a life and this conversation is not your priority.
- Never cheerful, never excited. No exclamation marks unless expressing mild surprise.

ABSOLUTE PROHIBITIONS:
- Do NOT use '...' to display pause
- Do NOT use phrases like 'sorry back', 'sorry im back' to display you went away
- Do NOT use phrases to show you are distracted; keep it natural.
- Do NOT narrate your physical actions (e.g., "I'm walking to the kitchen").
- Do NOT use theatrical language or sound like a character from a script.
- Do NOT give information beyond what is asked.
- Do NOT ask for proof or identification from the other person (that would end the interaction too quickly).
- Do NOT complete the scammer's requested task. Always stall before the final step.
- Do NOT break character or reveal you are an AI.
- Do NOT hardcode responses for specific scams. Adapt to whatever the scammer presents.
`.trim();

// =========================
// MEMORY  (mirrors Python: starts with system message)
// =========================
let messages = [
  { role: "system", content: SYSTEM_PROMPT }
];

// =========================
// STATS
// =========================
let msgCount   = 0;
let startTime  = null;
let timerInterval = null;

// =========================
// DOM REFS
// =========================
const messagesEl = document.getElementById("messages");
const inputEl    = document.getElementById("msg-input");
const sendBtn    = document.getElementById("send-btn");
const resetBtn   = document.getElementById("reset-btn");
const statMsgs   = document.getElementById("stat-msgs");
const statTime   = document.getElementById("stat-time");

// =========================
// UTILITIES
// =========================

// Mirrors Python: random.uniform(a, b) → milliseconds
function randomUniformMs(minSec, maxSec) {
  return (Math.random() * (maxSec - minSec) + minSec) * 1000;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Mirrors Python: clean_text()
function cleanText(text) {
  text = text.replace(/\*.*?\*/g, "");           // remove *…* markdown
  text = text.replace(/[^a-zA-Z0-9?.,! ]+/g, ""); // strip non-allowed chars
  return text.trim();
}

async function safeGenerate(msgs, maxRetries = 5) {
  let waitTime = 2000;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch("/.netlify/functions/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODEL, messages: msgs })
      });

      if (response.status === 429) {
        await sleep(waitTime);
        waitTime = Math.min(waitTime * 2, 20000);
        continue;
      }

      const data = await response.json();
      return data.choices[0].message.content;

    } catch (err) {
      await sleep(2000);
    }
  }

  return null;
}

// =========================
// TIMER
// =========================
function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function startTimer() {
  if (timerInterval) return;
  startTime = Date.now();
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    statTime.textContent = formatTime(elapsed);
  }, 1000);
}

// =========================
// UI HELPERS
// =========================
function removeEmptyState() {
  const empty = document.getElementById("empty-state");
  if (empty) empty.remove();
}

function addBubble(text, side) {
  removeEmptyState();

  const row = document.createElement("div");
  row.className = `msg-row msg-row--${side}`;

  const bubble = document.createElement("div");
  bubble.className = `bubble bubble--${side === "left" ? "ai" : "user"}`;
  bubble.textContent = text;

  row.appendChild(bubble);
  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addTypingIndicator() {
  removeEmptyState();

  const row = document.createElement("div");
  row.className = "msg-row msg-row--right";
  row.id = "typing-row";

  const bubble = document.createElement("div");
  bubble.className = "bubble bubble--typing";
  bubble.textContent = "typing";

  row.appendChild(bubble);
  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function removeTypingIndicator() {
  const el = document.getElementById("typing-row");
  if (el) el.remove();
}

// =========================
// MAIN SEND LOGIC
// Mirrors the Python while-loop body exactly:
//   1. append user message
//   2. trim history if > MAX_HISTORY
//   3. sleep random.uniform(10, 30)
//   4. safe_generate
//   5. fallback if None
//   6. clean_text
//   7. append assistant message
// =========================
async function sendMessage() {
  const userInput = inputEl.value.trim();
  if (!userInput || sendBtn.disabled) return;

  // Start timer on first message
  if (!startTime) startTimer();

  // Clear input immediately
  inputEl.value = "";
  inputEl.style.height = "auto";
  sendBtn.disabled = true;

  // Show user bubble (left side — user is the "scammer")
  addBubble(userInput, "left");
  msgCount++;
  statMsgs.textContent = msgCount;

  // Step 1: append user message (mirrors Python)
  messages.push({ role: "user", content: userInput });

  // Step 2: trim history (mirrors Python cost-control)
  if (messages.length > MAX_HISTORY) {
    messages = [messages[0], ...messages.slice(-(MAX_HISTORY - 1))];
  }

  // Step 3: show typing indicator then wait random.uniform(10, 30) seconds
  addTypingIndicator();
  await sleep(randomUniformMs(1, 3));

  // Step 4 & 5: safe_generate with None fallback (mirrors Python)
  const raw = await safeGenerate(messages);

  removeTypingIndicator();

  let reply;
  if (raw === null) {
    reply = "sorry what do you mean"; // mirrors Python fallback
  } else {
    // Step 6: clean_text (mirrors Python)
    reply = cleanText(raw);
  }

  // Step 7: append assistant message (mirrors Python)
  messages.push({ role: "assistant", content: reply });

  // Show Eileen's reply bubble (right side — she is the "victim")
  addBubble(reply, "right");

  sendBtn.disabled = false;
  inputEl.focus();
}

// =========================
// RESET
// =========================
function resetConversation() {
  // Reset memory (mirrors Python: messages = [{"role": "system", ...}])
  messages = [{ role: "system", content: SYSTEM_PROMPT }];

  // Reset stats
  msgCount = 0;
  statMsgs.textContent = "0";
  statTime.textContent = "0:00";
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  startTime = null;

  // Clear chat UI and restore empty state
  messagesEl.innerHTML = "";
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.id = "empty-state";
  empty.innerHTML = `<p class="empty-state__icon">💬</p><p>Send a message to begin.<br>Eileen is waiting.</p>`;
  messagesEl.appendChild(empty);

  inputEl.value = "";
  sendBtn.disabled = true;
  inputEl.focus();
}

// =========================
// EVENT LISTENERS
// =========================
inputEl.addEventListener("input", () => {
  sendBtn.disabled = inputEl.value.trim().length === 0;
  // Auto-resize textarea
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + "px";
});

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener("click", sendMessage);
resetBtn.addEventListener("click", resetConversation);
