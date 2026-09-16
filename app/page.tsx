"use client";

import { useEffect, useMemo, useState } from "react";
import {
  conversations as seedConversations,
  knowledgeArticles,
  quickReplies,
  type Conversation,
  type Message,
  type Preference,
  type TicketPriority,
  type TicketStatus,
} from "./workspace-data";

const PREF_KEY = "nexusdesk.agent.preference.v1";
const defaultPreference: Preference = {
  visibleModules: ["account", "subscription", "contacts", "history"],
  compact: true,
};

const channelLabel = { web: "在线", email: "邮件", wecom: "企微" } as const;
const priorityLabel: Record<TicketPriority, string> = { low: "低", normal: "普通", high: "高", urgent: "紧急" };
const statusLabel: Record<TicketStatus, string> = { new: "待处理", processing: "处理中", waiting: "待客户回复", solved: "已解决", closed: "已关闭" };

export default function Home() {
  const [items, setItems] = useState<Conversation[]>(seedConversations);
  const [activeId, setActiveId] = useState(seedConversations[0].id);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [draft, setDraft] = useState("");
  const [activeTab, setActiveTab] = useState<"chat" | "tickets">("chat");
  const [mobilePanel, setMobilePanel] = useState<"list" | "chat" | "detail">("chat");
  const [drawer, setDrawer] = useState<"knowledge" | "quick" | "custom" | null>(null);
  const [notice, setNotice] = useState("");
  const [pref, setPref] = useState<Preference>(defaultPreference);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PREF_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Preference;
        if (Array.isArray(parsed.visibleModules)) setPref(parsed);
      }
    } catch { localStorage.removeItem(PREF_KEY); }
  }, []);

  const savePref = (next: Preference) => {
    setPref(next);
    localStorage.setItem(PREF_KEY, JSON.stringify(next));
    flash("工作台偏好已保存");
  };

  const active = items.find((item) => item.id === activeId) ?? items[0];
  const filtered = items.filter((item) => {
    const matchQuery = `${item.account.name}${item.contact.name}${item.subject}`.toLowerCase().includes(query.toLowerCase());
    const matchFilter = filter === "all" || (filter === "unread" && item.unread > 0) || (filter === "risk" && item.slaTone !== "safe") || item.channel === filter;
    return matchQuery && matchFilter;
  });

  const tickets = useMemo(() => items.flatMap((item) => item.tickets.map((ticket) => ({ ...ticket, source: item }))), [items]);

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2200);
  }

  function sendMessage() {
    if (!draft.trim()) return;
    const message: Message = { id: `m-${Date.now()}`, from: "agent", text: draft.trim(), time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) };
    setItems((current) => current.map((item) => item.id === active.id ? { ...item, messages: [...item.messages, message], unread: 0 } : item));
    setDraft("");
    flash("消息已发送");
  }

  function createTicket() {
    if (active.tickets.length) {
      flash(`已关联工单 ${active.tickets[0].id}`);
      setActiveTab("tickets");
      return;
    }
    const ticket = { id: `TK-${Math.floor(2600 + Math.random() * 300)}`, title: active.subject, category: "产品使用", priority: "normal" as const, status: "new" as const, owner: "林知夏", sla: "3小时 48分", followUp: "今天 18:00" };
    setItems((current) => current.map((item) => item.id === active.id ? { ...item, tickets: [ticket] } : item));
    setActiveTab("tickets");
    flash(`工单 ${ticket.id} 已创建`);
  }

  function updateTicket(id: string, field: "priority" | "status", value: string) {
    setItems((current) => current.map((item) => ({ ...item, tickets: item.tickets.map((ticket) => ticket.id === id ? { ...ticket, [field]: value } : ticket) })));
    flash("工单已更新");
  }

  function toggleModule(module: string) {
    const visibleModules = pref.visibleModules.includes(module) ? pref.visibleModules.filter((m) => m !== module) : [...pref.visibleModules, module];
    savePref({ ...pref, visibleModules });
  }

  return (
    <main className={`app ${pref.compact ? "compact" : ""}`}>
      <header className="topbar">
        <div className="brand"><span className="brand-mark">N</span><div><strong>NexusDesk</strong><small>企业服务中心</small></div></div>
        <div className="metrics">
          <Metric label="今日接待" value="28" trend="+12%" />
          <Metric label="待处理工单" value="7" tone="warn" />
          <Metric label="首次响应" value="42秒" trend="-8秒" />
          <Metric label="解决率" value="92%" />
          <Metric label="满意度" value="4.9" />
        </div>
        <div className="agent"><span className="online-dot"/><div><strong>林知夏</strong><small>在线 · 企业支持组</small></div><button className="icon-button" onClick={() => setDrawer("custom")} aria-label="定制工作台">⚙</button></div>
      </header>

      <nav className="mobile-nav" aria-label="移动端视图切换">
        {([['list','队列'],['chat','会话'],['detail','客户']] as const).map(([id,label]) => <button key={id} className={mobilePanel === id ? "active" : ""} onClick={() => setMobilePanel(id)}>{label}</button>)}
      </nav>

      <section className="workspace">
        <aside className={`queue-panel panel mobile-${mobilePanel === "list" ? "show" : "hide"}`}>
          <div className="panel-head"><div><h1>服务队列</h1><p>{filtered.length} 个进行中会话</p></div><button className="icon-button">＋</button></div>
          <label className="search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索企业、联系人或问题" /></label>
          <div className="filters">
            {[['all','全部'],['unread','未读'],['risk','SLA风险'],['wecom','企微'],['email','邮件']] .map(([id,label]) => <button key={id} className={filter === id ? "active" : ""} onClick={() => setFilter(id)}>{label}</button>)}
          </div>
          <div className="queue-list">
            {filtered.length ? filtered.map((item) => <button className={`queue-item ${item.id === active.id ? "active" : ""}`} key={item.id} onClick={() => { setActiveId(item.id); setMobilePanel("chat"); }}>
              <div className="queue-avatar">{item.account.short}</div>
              <div className="queue-copy"><div className="queue-row"><strong>{item.account.name}</strong><time>{item.lastTime}</time></div><div className="subject">{item.subject}</div><div className="queue-meta"><span className={`channel ${item.channel}`}>{channelLabel[item.channel]}</span><span className={`sla ${item.slaTone}`}>● {item.sla}</span></div></div>
              {item.unread > 0 && <span className="unread">{item.unread}</span>}
            </button>) : <div className="empty"><span>⌕</span><strong>没有匹配的会话</strong><p>试试调整关键词或筛选条件</p></div>}
          </div>
        </aside>

        <section className={`conversation-panel panel mobile-${mobilePanel === "chat" ? "show" : "hide"}`}>
          <div className="conversation-head">
            <div className="company-title"><div className="queue-avatar large">{active.account.short}</div><div><div className="title-line"><h2>{active.contact.name}</h2><span className="vip">{active.account.tier}</span></div><p>{active.account.name} · {active.contact.role}</p></div></div>
            <div className="head-actions"><span className={`sla-banner ${active.slaTone}`}>SLA {active.sla}</span><button onClick={() => setMobilePanel("detail")} className="ghost-button mobile-only">客户详情</button><button className="primary-button" onClick={createTicket}>转为工单</button><button className="icon-button">•••</button></div>
          </div>
          {active.alert && <div className={`risk-alert ${active.slaTone}`}><span>!</span><div><strong>{active.alert.title}</strong><p>{active.alert.text}</p></div><button onClick={() => flash("已标记为重点关注")}>标记关注</button></div>}
          <div className="context-line"><span>{channelLabel[active.channel]}会话</span><span>问题分类：{active.category}</span><span>会话编号 {active.id}</span></div>

          <div className="messages" aria-live="polite">
            <div className="day-divider"><span>今天</span></div>
            {active.messages.map((message) => <div className={`message-row ${message.from}`} key={message.id}>
              <div className="message-avatar">{message.from === "agent" ? "林" : active.contact.name.slice(0,1)}</div>
              <div className="message-wrap"><div className="message-meta"><strong>{message.from === "agent" ? "林知夏" : active.contact.name}</strong><time>{message.time}</time></div><div className="message-bubble">{message.text}</div>{message.from === "agent" && <small className="read">已读</small>}</div>
            </div>)}
          </div>

          <div className="composer">
            <div className="composer-tools"><button onClick={() => setDrawer("quick")}>⚡ 快捷回复</button><button onClick={() => setDrawer("knowledge")}>▤ 知识库</button><button onClick={() => flash("演示版暂不上传附件")}>⌕ 附件</button><button onClick={() => setDraft((v) => v ? `【内部记录】${v}` : "【内部记录】")}>▣ 内部记录</button></div>
            <textarea aria-label="消息内容" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="输入回复，Enter 发送，Shift + Enter 换行…" />
            <div className="composer-foot"><span>当前通过 {channelLabel[active.channel]} 回复</span><div><button className="ghost-button" onClick={() => setDraft("")}>清空</button><button className="primary-button" onClick={sendMessage}>发送 <kbd>↵</kbd></button></div></div>
          </div>
        </section>

        <aside className={`detail-panel panel mobile-${mobilePanel === "detail" ? "show" : "hide"}`}>
          <div className="detail-tabs"><button className={activeTab === "chat" ? "active" : ""} onClick={() => setActiveTab("chat")}>客户全景</button><button className={activeTab === "tickets" ? "active" : ""} onClick={() => setActiveTab("tickets")}>关联工单 <span>{active.tickets.length}</span></button></div>
          {activeTab === "chat" ? <div className="detail-scroll">
            {pref.visibleModules.includes("account") && <DetailSection title="企业概览"><div className="account-card"><div className="account-logo">{active.account.short}</div><div><strong>{active.account.name}</strong><p>{active.account.industry} · {active.account.scale}</p></div></div><dl className="facts"><div><dt>客户等级</dt><dd><span className="vip">{active.account.tier}</span></dd></div><div><dt>客户健康度</dt><dd className={active.account.health < 75 ? "danger-text" : "good-text"}>{active.account.health} / 100</dd></div><div><dt>客户编号</dt><dd>{active.account.id}</dd></div><div><dt>所属地区</dt><dd>{active.account.region}</dd></div></dl></DetailSection>}
            {pref.visibleModules.includes("subscription") && <DetailSection title="订阅与合同"><div className="product-row"><span className="product-icon">◆</span><div><strong>{active.subscription.product}</strong><p>{active.subscription.version} · {active.subscription.seats} 个席位</p></div><span className="status-ok">生效中</span></div><dl className="facts"><div><dt>合同到期</dt><dd>{active.subscription.expire}</dd></div><div><dt>服务方案</dt><dd>{active.subscription.plan}</dd></div></dl></DetailSection>}
            {pref.visibleModules.includes("contacts") && <DetailSection title="当前联系人"><div className="contact-card"><div className="contact-avatar">{active.contact.name.slice(0,1)}</div><div><strong>{active.contact.name}</strong><p>{active.contact.role}</p></div><button onClick={() => flash("联系人信息已复制")}>复制信息</button></div><div className="contact-detail"><span>✉ {active.contact.email}</span><span>☎ {active.contact.phone}</span></div></DetailSection>}
            {pref.visibleModules.includes("history") && <DetailSection title="近期服务记录"><div className="timeline">{active.history.map((entry, i) => <div key={i}><span className="timeline-dot"/><div><strong>{entry.title}</strong><p>{entry.meta}</p></div></div>)}</div></DetailSection>}
          </div> : <TicketPanel active={active} tickets={active.tickets} onUpdate={updateTicket} onCreate={createTicket} />}
        </aside>
      </section>

      {drawer && <div className="drawer-backdrop" onMouseDown={() => setDrawer(null)}><aside className="drawer" onMouseDown={(e) => e.stopPropagation()}>
        <div className="drawer-head"><div><h2>{drawer === "knowledge" ? "知识库" : drawer === "quick" ? "快捷回复" : "定制工作台"}</h2><p>{drawer === "custom" ? "按你的习惯组织客户信息" : "选择内容插入当前回复"}</p></div><button className="icon-button" onClick={() => setDrawer(null)}>×</button></div>
        {drawer === "knowledge" && <KnowledgeList onSelect={(text) => { setDraft(text); setDrawer(null); }} />}
        {drawer === "quick" && <div className="drawer-list">{quickReplies.map((reply) => <button key={reply.title} onClick={() => { setDraft(reply.content); setDrawer(null); }}><strong>{reply.title}</strong><p>{reply.content}</p></button>)}</div>}
        {drawer === "custom" && <Customize pref={pref} onToggle={toggleModule} onDensity={() => savePref({ ...pref, compact: !pref.compact })} onReset={() => savePref(defaultPreference)} />}
      </aside></div>}
      {notice && <div className="toast">✓ {notice}</div>}
    </main>
  );
}

function Metric({ label, value, trend, tone }: { label: string; value: string; trend?: string; tone?: string }) { return <div className={`metric ${tone ?? ""}`}><span>{label}</span><strong>{value}</strong>{trend && <small>{trend}</small>}</div>; }
function DetailSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="detail-section"><h3>{title}<button aria-label={`${title}更多操作`}>•••</button></h3>{children}</section>; }

function TicketPanel({ active, tickets, onUpdate, onCreate }: { active: Conversation; tickets: Conversation["tickets"]; onUpdate: (id: string, field: "priority" | "status", value: string) => void; onCreate: () => void }) {
  return <div className="ticket-panel"><div className="ticket-summary"><span>当前会话关联</span><strong>{tickets.length} 个工单</strong></div>{tickets.length ? tickets.map((ticket) => <article className="ticket-card" key={ticket.id}><div className="ticket-id"><span>{ticket.id}</span><span className={`priority p-${ticket.priority}`}>{priorityLabel[ticket.priority]}</span></div><h3>{ticket.title}</h3><p>{ticket.category} · 来源于当前会话</p><label>状态<select value={ticket.status} onChange={(e) => onUpdate(ticket.id, "status", e.target.value)}>{Object.entries(statusLabel).map(([id,label]) => <option value={id} key={id}>{label}</option>)}</select></label><label>优先级<select value={ticket.priority} onChange={(e) => onUpdate(ticket.id, "priority", e.target.value)}>{Object.entries(priorityLabel).map(([id,label]) => <option value={id} key={id}>{label}</option>)}</select></label><dl className="facts"><div><dt>负责人</dt><dd>{ticket.owner}</dd></div><div><dt>SLA 剩余</dt><dd className="warning-text">{ticket.sla}</dd></div><div><dt>下次跟进</dt><dd>{ticket.followUp}</dd></div></dl><button className="wide-button" onClick={() => window.alert(`已打开 ${ticket.id} 的完整处理记录`)}>查看完整处理记录 →</button></article>) : <div className="empty tickets-empty"><span>▤</span><strong>暂未关联工单</strong><p>将本次会话转为工单，持续跟进客户问题</p><button className="primary-button" onClick={onCreate}>创建工单</button></div>}<div className="source-note">来源会话：{active.id}</div></div>;
}

function KnowledgeList({ onSelect }: { onSelect: (text: string) => void }) {
  const [q, setQ] = useState("");
  const result = knowledgeArticles.filter((a) => `${a.title}${a.tags.join("")}`.includes(q));
  return <><label className="search drawer-search"><span>⌕</span><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索知识文章" /></label><div className="drawer-list">{result.map((article) => <button key={article.id} onClick={() => onSelect(article.reply)}><div className="article-meta"><span>{article.category}</span><small>{article.views} 次使用</small></div><strong>{article.title}</strong><p>{article.summary}</p><div className="article-tags">{article.tags.map((tag) => <i key={tag}>{tag}</i>)}</div></button>)}</div></>;
}

function Customize({ pref, onToggle, onDensity, onReset }: { pref: Preference; onToggle: (module: string) => void; onDensity: () => void; onReset: () => void }) {
  const labels: Record<string,string> = { account: "企业概览", subscription: "订阅与合同", contacts: "当前联系人", history: "近期服务记录" };
  return <div className="customize"><h3>客户侧栏模块</h3>{Object.entries(labels).map(([id,label], index) => <div className="module-row" key={id}><span className="drag">⋮⋮</span><div><strong>{label}</strong><small>模块 {index + 1}</small></div><button role="switch" aria-checked={pref.visibleModules.includes(id)} className={`switch ${pref.visibleModules.includes(id) ? "on" : ""}`} onClick={() => onToggle(id)}><i/></button></div>)}<h3>显示密度</h3><button className="setting-card" onClick={onDensity}><div><strong>{pref.compact ? "紧凑模式" : "舒适模式"}</strong><p>调整列表和信息模块的间距</p></div><span>切换</span></button><button className="reset-button" onClick={onReset}>恢复默认设置</button></div>;
}
