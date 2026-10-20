import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUpRight, Check, ChevronDown, ChevronRight, CircleHelp, FilePlus2, FileText, MoreHorizontal, Plus, RefreshCw, Search, Settings2, Sparkles, Table2, X } from 'lucide-react';
import { getBitableRecords, loadBitableContext, loadPluginConfig, savePluginConfig, selectBitableRecords, type BitableContext, type BitableRecord } from './bitable';

const fields = ['客户名称', '客户统一社会信用代码', '合同编号', '合同金额', '签订日期', '联系人', '联系电话', '收货地址'];
const sampleRecord: Record<string, string> = {
  '客户名称': '上海澄海医药有限公司', '客户统一社会信用代码': '91310115MA1K4X8R2Q',
  '合同编号': 'PC-2026-1028', '合同金额': '¥ 286,000.00', '签订日期': '2026年10月19日',
  '联系人': '陈欣', '联系电话': '138 0000 2688', '收货地址': '上海市浦东新区张江高科技园区',
};
const defaultBindings = Object.fromEntries(fields.map((field) => [field, field]));

export default function App() {
  const [bindings, setBindings] = useState<Record<string, string>>(defaultBindings);
  const [selected, setSelected] = useState('上海澄海医药有限公司');
  const [generated, setGenerated] = useState(false);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [context, setContext] = useState<BitableContext | null>(null);
  const [connected, setConnected] = useState(false);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const actualFields = context?.fields.length ? context.fields.map(({ name }) => name) : fields;
  const actualRecords = context?.records.length ? context.records : [];
  const visibleRecords = useMemo(() => {
    if (!actualRecords.length) return [];
    return actualRecords.filter((record) => JSON.stringify(record.fields).toLowerCase().includes(query.toLowerCase())).slice(0, 50);
  }, [actualRecords, query]);
  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => { if (active) setConnected(false); }, 4000);
    loadBitableContext().then(async (value) => {
      if (!active) return;
      window.clearTimeout(timeout);
      setContext(value);
      setConnected(true);
      setSelectedRecordIds(value.selectedRecordIds);
      const savedBindings = await loadPluginConfig<Record<string, string>>();
      if (active && savedBindings) setBindings((current) => ({ ...current, ...savedBindings }));
      const selectedRecord = value.records.find((record) => record.recordId === value.selectedRecordIds[0]) ?? value.records[0];
      if (selectedRecord) {
        const primary = value.fields.find(({ id }) => id in selectedRecord.fields);
        const primaryValue = primary ? selectedRecord.fields[primary.id] : undefined;
        if (primaryValue != null) setSelected(String(primaryValue));
      }
    }).catch(() => { if (active) setConnected(false); });
    return () => { active = false; window.clearTimeout(timeout); };
  }, []);
  const recordValue = (record: BitableRecord, fieldName: string) => {
    const field = context?.fields.find(({ name }) => name === fieldName);
    const value = field ? record.fields[field.id] : undefined;
    return value == null ? '' : typeof value === 'string' || typeof value === 'number' ? String(value) : JSON.stringify(value);
  };
  const selectedRecord = context?.records.find((record) => selectedRecordIds.includes(record.recordId)) ?? context?.records[0];
  const valueFor = (variable: string) => {
    const fieldName = bindings[variable];
    if (selectedRecord && fieldName) return recordValue(selectedRecord, fieldName) || '—';
    return sampleRecord[variable] ?? `{{${variable}}}`;
  };
  const generatePdf = () => {
    const missing = Object.keys(bindings).filter((variable) => !bindings[variable]);
    if (missing.length) {
      setNotice(`请先绑定字段：${missing.join('、')}`);
      return;
    }
    const escape = (text: string) => text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
    const customer = escape(valueFor('客户名称'));
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setNotice('浏览器阻止了打印窗口，请允许此插件打开弹窗后重试');
      return;
    }
    printWindow.document.write(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>销售合同-${customer}</title><style>
      @page{size:A4;margin:22mm 24mm}*{box-sizing:border-box}body{font-family:"Noto Serif CJK SC","Songti SC","SimSun",serif;color:#20252a;font-size:12pt;line-height:1.9}h1{text-align:center;font-size:20pt;margin:0 0 24pt}h2{font-size:13pt;margin:24pt 0 8pt}.meta{border-bottom:1px solid #9aa3aa;padding-bottom:12pt;margin-bottom:18pt}.row{margin:8pt 0}.label{font-weight:600}.sign{display:flex;justify-content:space-between;margin-top:54pt}.date{text-align:right;margin-top:24pt}@media screen{body{max-width:760px;margin:30px auto;padding:45px;box-shadow:0 2px 18px #0002}.toolbar{position:sticky;top:0;background:#fff;padding:12px;text-align:right}.toolbar button{padding:9px 16px;border:0;background:#18866f;color:white;border-radius:4px;cursor:pointer}}@media print{.toolbar{display:none}}
    </style></head><body><div class="toolbar"><button onclick="window.print()">打印 / 保存为 PDF</button></div><h1>产品销售合同</h1><div class="meta"><div class="row"><span class="label">合同编号：</span>${escape(valueFor('合同编号'))}</div></div><div class="row"><span class="label">甲方（客户）：</span>${customer}</div><div class="row"><span class="label">统一社会信用代码：</span>${escape(valueFor('客户统一社会信用代码'))}</div><div class="row"><span class="label">联系人：</span>${escape(valueFor('联系人'))}</div><div class="row"><span class="label">联系电话：</span>${escape(valueFor('联系电话'))}</div><h2>第一条　合同金额</h2><p>本合同总金额为人民币 ${escape(valueFor('合同金额'))}。</p><h2>第二条　交付与验收</h2><p>乙方按照约定向甲方交付产品，收货地址：${escape(valueFor('收货地址'))}。</p><h2>第三条　合同期限</h2><p>本合同自双方签字盖章之日起生效。</p><div class="sign"><span>甲方（盖章）：</span><span>乙方（盖章）：</span></div><div class="date">签订日期：${escape(valueFor('签订日期'))}</div></body></html>`);
    printWindow.document.close();
    setGenerated(true);
    setNotice('已打开合同打印页；在打印对话框选择“保存为 PDF”即可导出');
  };
  const setBinding = (key: string, value: string) => {
    setBindings((current) => {
      const updated = { ...current, [key]: value };
      if (connected) void savePluginConfig(updated);
      return updated;
    });
  };
  const chooseRecords = async () => {
    if (!context?.tableId || !context.viewId) {
      setNotice('请在飞书多维表格扩展视图中选择记录');
      return;
    }
    try {
      const ids = await selectBitableRecords(context.tableId, context.viewId);
      setSelectedRecordIds(ids);
      const records = await getBitableRecords(context.tableId, ids);
      setContext((current) => current ? { ...current, selectedRecordIds: ids, records } : current);
      if (records[0]) setSelected(recordValue(records[0], bindings['客户名称'] || actualFields[0]) || records[0].recordId);
      setGenerated(false);
    } catch {
      setNotice('未能读取所选记录，请检查插件权限后重试');
    }
  };

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><FileText size={17} /></div><span>文档生成器</span><span className="top-divider" /><span className="context"><Table2 size={14} /> 销售合同管理</span><ChevronRight size={13} className="muted-icon" /><span className="context">合同记录</span></div>
      <div className="top-actions"><span className="connection"><i className={connected ? '' : 'offline'} /> {connected ? '多维表格已连接' : '演示数据'}</span><button className="icon-button" title="帮助"><CircleHelp size={17} /></button><button className="avatar" title="当前用户">林</button></div>
    </header>

    <div className="workspace">
      <aside className="sidebar">
        <div className="side-heading"><span>模板</span><button className="icon-button small" title="新建模板" onClick={() => { setEditing(true); setNotice('新模板已创建'); }}><Plus size={16} /></button></div>
        <button className="template-item active"><span className="doc-icon"><FileText size={15} /></span><span className="template-copy"><b>销售合同</b><small>更新于 10月18日</small></span><MoreHorizontal size={17} className="more" /></button>
        <button className="template-item"><span className="doc-icon green"><FileText size={15} /></span><span className="template-copy"><b>产品发货单</b><small>更新于 10月12日</small></span><MoreHorizontal size={17} className="more" /></button>
        <button className="new-template" onClick={() => { setEditing(true); setNotice('新模板已创建'); }}><FilePlus2 size={15} /> 新建模板</button>
        <div className="side-separator" />
        <div className="side-heading"><span>生成记录</span><button className="text-icon" title="刷新"><RefreshCw size={14} /></button></div>
        <div className="history-row"><span className="history-dot done" /><span><b>上海澄海医药有限公司</b><small>销售合同 · 刚刚生成</small></span></div>
        <div className="history-row"><span className="history-dot" /><span><b>杭州景明生物科技</b><small>销售合同 · 10月17日</small></span></div>
        <div className="history-row"><span className="history-dot" /><span><b>苏州安和医疗</b><small>销售合同 · 10月16日</small></span></div>
        <div className="side-footer"><Settings2 size={15} /> 设置</div>
      </aside>

      <section className="main-panel">
        <div className="page-heading"><div><div className="breadcrumb">模板配置 <ChevronRight size={12} /> 销售合同</div><h1>销售合同</h1><p>将文档中的变量绑定到多维表格字段，按记录生成合同。</p></div><button className="outline-button" onClick={() => setEditing(true)}><FileText size={15} /> 在飞书中编辑模板 <ArrowUpRight size={14} /></button></div>
        {notice && <div className="notice"><Check size={15} /> {notice}<button onClick={() => setNotice('')} aria-label="关闭"><X size={15} /></button></div>}

        <div className="setup-strip"><div className="step done"><span><Check size={13} /></span><b>選择模板</b></div><div className="step-line" /><div className="step current"><span>2</span><b>绑定字段</b></div><div className="step-line" /><div className="step"><span>3</span><b>选择记录并生成</b></div><div className="strip-right"><button className="plain-button"><Table2 size={14} /> {context?.tableName ?? '合同记录'} <ChevronDown size={13} /></button></div></div>

        <div className="content-grid">
          <div className="mapping-column">
            <section className="section-block"><div className="section-head"><div><h2>变量绑定</h2><p>检测到模板中 6 个变量，选择对应的多维表格字段。</p></div><button className="text-button" onClick={() => setNotice('已重新读取模板变量')}><RefreshCw size={14} /> 重新读取</button></div>
              <div className="binding-table"><div className="table-head"><span>模板变量</span><span>绑定到字段</span><span>状态</span></div>
                {['客户名称', '客户统一社会信用代码', '合同编号', '合同金额', '签订日期', '联系人'].map((name) => <div className="binding-row" key={name}><div className="variable"><span className="brace">{`{{`}</span><span>{name}</span><span className="brace">{`}}`}</span></div><div className="select-wrap"><select aria-label={`绑定 ${name}`} value={bindings[name] || ''} onChange={(event) => setBinding(name, event.target.value)}><option value="">选择字段</option>{actualFields.map((field) => <option key={field}>{field}</option>)}</select><ChevronDown size={13} /></div><span className={`binding-status ${bindings[name] ? 'bound' : 'unbound'}`}>{bindings[name] ? <><Check size={13} /> 已绑定</> : '未绑定'}</span></div>)}
                <button className="add-binding" onClick={() => setNotice('新增变量请先在飞书文档模板中插入 {{变量名}}')}><Plus size={14} /> 添加变量</button>
              </div>
            </section>

            <section className="section-block record-block"><div className="section-head"><div><h2>选择记录</h2><p>选择一条合同记录作为本次生成的数据来源。</p></div><span className="record-count">{connected ? `${context?.records.length ?? 0} 条记录` : '演示数据'}</span></div>
              <div className="record-tools"><label className="search-box"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索客户或合同编号" /></label><button className="filter-button"><span className="filter-dot" /> 全部状态 <ChevronDown size={13} /></button></div>
              {connected && <button className="text-button record-picker" onClick={() => void chooseRecords()}><Check size={14} /> 从当前表格选择记录{selectedRecordIds.length ? `（已选 ${selectedRecordIds.length} 条）` : ''}</button>}
              <div className="records">{connected && visibleRecords.length ? visibleRecords.slice(0, 3).map((record, index) => { const name = recordValue(record, bindings['客户名称'] || actualFields[0]) || `记录 ${index + 1}`; return <button key={record.recordId} onClick={() => { setSelected(name); setGenerated(false); }} className={`record-option ${selected === name ? 'selected' : ''}`}><span className="radio" /><span className="record-primary"><b>{name}</b><small>{record.recordId}</small></span></button>; }) : <><button onClick={() => { setSelected('上海澄海医药有限公司'); setGenerated(false); }} className={`record-option ${selected === '上海澄海医药有限公司' ? 'selected' : ''}`}><span className="radio" /> <span className="record-primary"><b>上海澄海医药有限公司</b><small>PC-2026-1028　·　¥286,000</small></span><span className="record-date">2026/10/19</span></button><button onClick={() => { setSelected('杭州景明生物科技'); setGenerated(false); }} className={`record-option ${selected === '杭州景明生物科技' ? 'selected' : ''}`}><span className="radio" /> <span className="record-primary"><b>杭州景明生物科技</b><small>PC-2026-1022　·　¥152,400</small></span><span className="record-date">2026/10/17</span></button><button onClick={() => { setSelected('苏州安和医疗'); setGenerated(false); }} className={`record-option ${selected === '苏州安和医疗' ? 'selected' : ''}`}><span className="radio" /> <span className="record-primary"><b>苏州安和医疗</b><small>PC-2026-1016　·　¥98,000</small></span><span className="record-date">2026/10/16</span></button></>}</div>
            </section>
          </div>

          <aside className="preview-column"><div className="preview-head"><div><h2>文档预览</h2><p>销售合同模板</p></div><button className="icon-button small" title="预览选项"><MoreHorizontal size={17} /></button></div><div className="paper-frame"><div className="paper"><div className="paper-topline"><span>PHARMCUBE</span><span>销售合同</span></div><h3>产品销售合同</h3><p className="paper-no">合同编号：<mark>{valueFor('合同编号')}</mark></p><div className="paper-rule" /><p>甲方（客户）：<mark>{valueFor('客户名称')}</mark></p><p>统一社会信用代码：<mark>{valueFor('客户统一社会信用代码')}</mark></p><p>联系人：<mark>{valueFor('联系人')}</mark></p><p>双方经友好协商，就产品采购事宜达成如下协议：</p><h4>第一条　合同金额</h4><p>本合同总金额为人民币 <mark>{valueFor('合同金额')}</mark>。</p><h4>第二条　交付与验收</h4><p>乙方按照约定向甲方交付产品，收货地址：<mark>{valueFor('收货地址')}</mark>。</p><h4>第三条　合同期限</h4><p>本合同自双方签字盖章之日起生效。</p><div className="signature"><span>甲方（盖章）：</span><span>乙方（盖章）：</span></div><div className="paper-date">签订日期：<mark>{valueFor('签订日期')}</mark></div></div></div>
            {generated ? <div className="generated-result"><div className="result-icon"><Check size={16} /></div><div><b>合同已生成</b><small>{selected} · 刚刚</small></div><button title="打开生成的文档"><ArrowUpRight size={16} /></button></div> : <div className="output-note"><Sparkles size={14} /><span>生成后会创建一份新的飞书文档，原模板不会改变。</span></div>}
            <button className="generate-button" onClick={generatePdf}><Sparkles size={16} /> 生成 PDF <ArrowDown size={15} /></button>
            <div className="permission-note"><i /> 文件将保存到你的飞书云空间</div>
          </aside>
        </div>
      </section>
    </div>

    {editing && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(false); }}><section className="edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-title"><div className="modal-header"><div className="modal-title-icon"><FileText size={18} /></div><div><h2 id="edit-title">在飞书中编辑模板</h2><p>直接在飞书文档中调整内容和排版</p></div><button className="icon-button" title="关闭" onClick={() => setEditing(false)}><X size={17} /></button></div><div className="modal-body"><div className="doc-link-card"><div className="doc-link-icon"><FileText size={19} /></div><span><b>销售合同模板</b><small>飞书云文档 · 最近更新于 10月18日</small></span><button className="outline-button compact"><ArrowUpRight size={14} /> 打开文档</button></div><div className="modal-divider" /><div className="tip-heading"><Sparkles size={15} /> 模板变量</div><p className="modal-copy">在文档中使用双花括号标记需要填充的位置，保存后点击“重新读取”同步变量。</p><div className="token-list">{fields.slice(0, 6).map((field) => <button key={field} onClick={() => { navigator.clipboard?.writeText(`{{${field}}}`); setNotice(`已复制变量 {{${field}}}`); }}><code>{`{{${field}}}`}</code><span>复制</span></button>)}</div><button className="copy-fields" onClick={() => { navigator.clipboard?.writeText(fields.slice(0, 6).map((field) => `{{${field}}}`).join('\n')); setNotice('变量列表已复制'); }}><Plus size={14} /> 复制变量列表</button></div><div className="modal-footer"><span>文档内容会保留在飞书云文档中</span><button className="primary-button" onClick={() => { setEditing(false); setNotice('已同步模板变量'); }}>完成 <Check size={14} /></button></div></section></div>}
  </main>;
}
