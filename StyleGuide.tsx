
import React, { useState } from 'react';
import { 
  Palette, 
  Layout, 
  Box, 
  Type, 
  Zap, 
  Terminal, 
  Activity, 
  Check, 
  Maximize, 
  Move, 
  Shield, 
  Bell, 
  Search, 
  Plus, 
  Grid, 
  Layers, 
  MousePointer2, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  Moon, 
  Sun, 
  ToggleLeft, 
  ToggleRight, 
  Download, 
  Code,
  ShieldCheck,
  List,
  Calendar,
  Clock,
  MoreHorizontal,
  Filter,
  ArrowUpRight,
  TrendingUp,
  User,
  MapPin,
  Mail,
  Phone,
  ChevronRight,
  Menu
} from 'lucide-react';
import { ParallaxLogo } from './ParallaxLogo';
import { ParallaxOrb, OrbState } from './ParallaxOrb';

// --- SUB-COMPONENTS ---

const SectionHeader = ({ title, description }: { title: string, description: string }) => (
  <div className="mb-10 pb-6 border-b border-border">
    <h2 className="text-4xl font-bold text-text-main tracking-tight mb-3">{title}</h2>
    <p className="text-lg text-text-secondary max-w-3xl leading-relaxed">{description}</p>
  </div>
);

const ColorSwatch = ({ name, token, hex, usage }: { name: string, token: string, hex: string, usage: string }) => (
  <div className="flex flex-col gap-3 group">
    <div className={`h-28 w-full rounded-2xl border border-border/50 shadow-sm ${token.replace('var(', '').replace(')', '')} relative overflow-hidden transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-md`}>
       <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-0 group-hover:opacity-10 transition-opacity"></div>
       <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-black/30 backdrop-blur-md rounded-lg text-[10px] font-mono text-white opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
         {hex}
       </div>
    </div>
    <div>
      <div className="flex items-center justify-between">
        <p className="font-bold text-sm text-text-main">{name}</p>
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <code className="text-[10px] bg-surface-sunken px-2 py-1 rounded border border-border text-text-muted font-mono cursor-pointer hover:bg-brand-surface hover:text-brand-text transition-colors select-all" title="Copiar Token">
            {token}
        </code>
      </div>
      <p className="text-xs text-text-secondary mt-2 leading-relaxed opacity-80">{usage}</p>
    </div>
  </div>
);

const TokenRow = ({ name, value, usage }: { name: string, value: string, usage: string }) => (
  <tr className="border-b border-border/50 last:border-0 hover:bg-surface-hover transition-colors group">
    <td className="py-4 px-4 font-mono text-xs text-brand-text font-bold group-hover:text-brand-hover">{name}</td>
    <td className="py-4 px-4 font-mono text-xs text-text-secondary opacity-70">{value}</td>
    <td className="py-4 px-4 text-xs text-text-muted">{usage}</td>
  </tr>
);

export const StyleGuide: React.FC = () => {
  const [activeTab, setActiveTab] = useState('identity');
  const [logoCollapsed, setLogoCollapsed] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Mobile menu state

  // Grouped Tabs for better organization
  const TAB_GROUPS = [
    {
      label: 'Fundamentos',
      items: [
        { id: 'identity', label: 'Identidade & Marca', icon: Layers },
        { id: 'colors', label: 'Cores & Temas', icon: Palette },
        { id: 'typography', label: 'Tipografia', icon: Type },
        { id: 'layout', label: 'Grid & Espaçamento', icon: Grid },
        { id: 'motion', label: 'Motion & UX', icon: Zap },
        { id: 'icons', label: 'Iconografia', icon: Activity },
      ]
    },
    {
      label: 'Biblioteca UI',
      items: [
        { id: 'components', label: 'Componentes Base', icon: Box },
        { id: 'cards', label: 'Cards & Widgets', icon: Layout },
        { id: 'tables', label: 'Tabelas & Listas', icon: List },
      ]
    },
    {
      label: 'Padrões de Sistema',
      items: [
        { id: 'layouts', label: 'Estruturas de Página', icon: Maximize },
        { id: 'admin', label: 'Console Admin', icon: ShieldCheck },
        { id: 'tokens', label: 'Design Tokens', icon: Terminal },
        { id: 'guidelines', label: 'Diretrizes', icon: Shield },
      ]
    }
  ];

  return (
    <div className="w-full h-full flex bg-page overflow-hidden font-sans relative">
      
      {/* 1. DOCUMENTATION SIDEBAR (Fixed Left) */}
      <aside className={`
        w-72 bg-surface border-r border-border flex-col h-full z-20 transition-transform duration-300
        ${isMenuOpen ? 'flex absolute left-0 shadow-2xl' : 'hidden md:flex relative'}
      `}>
        {/* Header Sidebar */}
        <div className="p-6 border-b border-border shrink-0 bg-surface/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-brand-surface rounded-lg border border-brand-border text-brand-main">
                    <Terminal size={20} />
                </div>
                <div>
                    <h1 className="text-sm font-bold text-text-main uppercase tracking-wider">Design System</h1>
                    <span className="text-[10px] text-text-muted font-mono">v2.8.0 / Enterprise</span>
                </div>
            </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-8">
            {TAB_GROUPS.map((group, idx) => (
                <div key={idx}>
                    <h3 className="px-3 text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] mb-2 flex items-center gap-2">
                        {group.label}
                        <div className="h-px bg-border flex-1 opacity-50"></div>
                    </h3>
                    <div className="space-y-0.5">
                        {group.items.map(tab => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => { setActiveTab(tab.id); setIsMenuOpen(false); }}
                                    className={`
                                        w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative
                                        ${isActive 
                                            ? 'bg-brand-surface text-brand-text font-bold shadow-sm ring-1 ring-brand-border/50' 
                                            : 'text-text-secondary hover:bg-surface-hover hover:text-text-main'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <tab.icon size={16} className={`transition-colors ${isActive ? 'text-brand-main' : 'text-text-muted group-hover:text-text-secondary'}`} />
                                        {tab.label}
                                    </div>
                                    {isActive && <ChevronRight size={14} className="text-brand-main animate-in slide-in-from-left-1" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>

        {/* Footer Sidebar */}
        <div className="p-4 border-t border-border bg-surface-sunken/30 text-center">
            <button className="text-xs font-bold text-text-muted hover:text-text-main flex items-center justify-center gap-2 w-full py-2 hover:bg-surface-hover rounded-lg transition-colors">
                <Download size={14} /> Baixar Tokens (JSON)
            </button>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA (Fluid Right) */}
      <main className="flex-1 flex flex-col min-w-0 bg-page relative overflow-hidden">
        
        {/* Mobile Header Toggle */}
        <div className="md:hidden p-4 border-b border-border bg-surface flex justify-between items-center">
            <div className="flex items-center gap-2 text-text-main font-bold">
                <Terminal size={20} className="text-brand-main" /> Design System
            </div>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 bg-surface-hover rounded-lg">
                <Menu size={20} />
            </button>
        </div>

        {/* Content Scrollable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(var(--border-subtle)_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none"></div>
            
            <div className="max-w-[1600px] mx-auto p-8 md:p-12 relative z-10">
                
                {/* 1. IDENTITY & ORB */}
                {activeTab === 'identity' && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <SectionHeader title="Logotipo & Identidade" description="A marca Parallax é definida por profundidade, camadas e movimento. Não é estática, ela vive e reage ao sistema." />
                        
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                            {/* LOGO */}
                            <div className="bg-surface border border-border rounded-3xl p-12 flex flex-col items-center justify-center gap-8 relative overflow-hidden group min-h-[400px]">
                                <div className="absolute inset-0 bg-gradient-to-br from-brand-main/5 via-transparent to-violet-500/5 opacity-50"></div>
                                <div className="scale-[4] transform transition-transform duration-500 ease-spring">
                                    <ParallaxLogo collapsed={logoCollapsed} onClick={() => setLogoCollapsed(!logoCollapsed)} />
                                </div>
                                <div className="flex gap-4 mt-8 relative z-10">
                                    <button onClick={() => setLogoCollapsed(false)} className={`px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border transition-all ${!logoCollapsed ? 'bg-brand-main text-white shadow-neon border-brand-main' : 'bg-surface border-border text-text-muted hover:text-text-main'}`}>Expandida</button>
                                    <button onClick={() => setLogoCollapsed(true)} className={`px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border transition-all ${logoCollapsed ? 'bg-brand-main text-white shadow-neon border-brand-main' : 'bg-surface border-border text-text-muted hover:text-text-main'}`}>Colapsada</button>
                                </div>
                            </div>

                            {/* ORB */}
                            <div className="bg-surface-sunken border border-border rounded-3xl p-12 min-h-[400px] flex flex-col justify-center relative overflow-hidden">
                                <div className="grid grid-cols-2 gap-12 place-items-center relative z-10">
                                    <div className="text-center space-y-4">
                                        <ParallaxOrb state="idle" size="lg" />
                                        <span className="text-[10px] font-mono uppercase text-text-muted tracking-widest block">Idle</span>
                                    </div>
                                    <div className="text-center space-y-4">
                                        <ParallaxOrb state="processing" size="lg" />
                                        <span className="text-[10px] font-mono uppercase text-brand-text tracking-widest block">Processing</span>
                                    </div>
                                    <div className="text-center space-y-4">
                                        <ParallaxOrb state="alert" size="lg" />
                                        <span className="text-[10px] font-mono uppercase text-amber-500 tracking-widest block">Alert</span>
                                    </div>
                                    <div className="text-center space-y-4">
                                        <ParallaxOrb state="critical" size="lg" />
                                        <span className="text-[10px] font-mono uppercase text-rose-500 tracking-widest block">Critical</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="prose prose-sm text-text-secondary bg-surface p-8 rounded-2xl border border-border">
                                <h3 className="text-text-main font-bold text-lg mb-4 flex items-center gap-2"><Layers size={20} className="text-brand-main"/> Lógica da Marca</h3>
                                <ul className="space-y-2 text-sm list-none pl-0">
                                    <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand-main mt-2 shrink-0"></div> <strong>Conceito:</strong> Camadas de dados se organizando para formar um todo coeso (Hexágono implícito).</li>
                                    <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand-main mt-2 shrink-0"></div> <strong>Comportamento:</strong> A logo reage ao estado da sidebar. Ela não é apenas visual, é um indicador de estado da UI.</li>
                                    <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand-main mt-2 shrink-0"></div> <strong>Cor:</strong> Gradiente `brand-400` para `violet-500`. Nunca usar em cor sólida flat, exceto em impressos monocromáticos.</li>
                                </ul>
                            </div>
                            <div className="prose prose-sm text-text-secondary bg-surface p-8 rounded-2xl border border-border">
                                <h3 className="text-text-main font-bold text-lg mb-4 flex items-center gap-2"><Zap size={20} className="text-brand-main"/> O Assistente Orbe</h3>
                                <p className="text-sm">O Orbe é a representação visual da IA do Parallax. Ele substitui ícones estáticos de status e loading.</p>
                                <ul className="space-y-2 text-sm list-none pl-0 mt-4">
                                    <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand-main mt-2 shrink-0"></div> <strong>Idle:</strong> Respiração suave (`pulse-slow`). Sistema monitorando.</li>
                                    <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand-main mt-2 shrink-0"></div> <strong>Processing:</strong> Rotação rápida de anéis (`spin`). Processando dados.</li>
                                    <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand-main mt-2 shrink-0"></div> <strong>Alert/Critical:</strong> Pulso de radar (`ping`). Requer atenção do usuário.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. COLORS */}
                {activeTab === 'colors' && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <SectionHeader title="Paleta Cromática & Temas" description="Sistema de cores semânticas adaptáveis (Light/Dark Mode). Nunca use hex codes diretamente, use sempre os tokens do sistema." />

                        <div className="p-6 bg-brand-surface/20 border border-brand-border/50 rounded-xl mb-8 flex gap-4 items-start">
                            <Info className="text-brand-main shrink-0 mt-1" size={20} />
                            <div>
                                <h3 className="text-sm font-bold text-text-main">Novo Padrão: Enterprise Light Mode</h3>
                                <p className="text-sm text-text-secondary mt-1">
                                    Substituímos o fundo branco absoluto por um tom <strong>Cool Grey (#eff3f8)</strong> para reduzir a fadiga visual. 
                                    Agora, a superfície branca (<code>bg-surface</code>) se destaca naturalmente sobre o fundo da página (<code>bg-page</code>), 
                                    eliminando a necessidade de sombras pesadas e bordas excessivas.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-10">
                            <section>
                                <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted border-b border-border pb-2 mb-6">Superfícies & Estrutura</h3>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                                    <ColorSwatch name="Page Background" token="bg-page" hex="Cool Grey (#eff3f8)" usage="Fundo global. Tom frio e denso para conforto visual." />
                                    <ColorSwatch name="Surface Default" token="bg-surface" hex="White / Slate 900" usage="Cards, painéis e áreas de conteúdo principais." />
                                    <ColorSwatch name="Surface Sunken" token="bg-surface-sunken" hex="Slate 50 / Slate 950" usage="Áreas rebaixadas, inputs, headers de tabelas." />
                                    <ColorSwatch name="Surface Hover" token="bg-surface-hover" hex="Slate 100 / Slate 800" usage="Estado de hover em itens interativos." />
                                    <ColorSwatch name="Surface Active" token="bg-surface-active" hex="Slate 200 / Slate 700" usage="Item selecionado ou pressionado." />
                                </div>
                            </section>

                            <section>
                                <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted border-b border-border pb-2 mb-6">Brand & Ação (Ciano a Violeta)</h3>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                                    <ColorSwatch name="Brand Main" token="bg-brand-main" hex="Cyan 600" usage="Ações primárias. Ajustado para contraste AA em Light Mode." />
                                    <ColorSwatch name="Brand Surface" token="bg-brand-surface" hex="Cyan 50 / Cyan 900 (Alpha)" usage="Fundo de elementos selecionados, badges de marca." />
                                    <ColorSwatch name="Brand Text" token="text-brand-text" hex="Cyan 600 / Cyan 400" usage="Texto de destaque, links, ícones ativos." />
                                    <ColorSwatch name="Brand Border" token="border-brand-border" hex="Cyan 200 / Cyan 800" usage="Bordas de inputs ativos ou cards selecionados." />
                                </div>
                            </section>

                            <section>
                                <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted border-b border-border pb-2 mb-6">Feedback Semântico</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <ColorSwatch name="Success" token="bg-emerald-500" hex="Emerald 500" usage="Confirmações, tendências positivas, status 'Pago'." />
                                    <ColorSwatch name="Warning" token="bg-amber-500" hex="Amber 500" usage="Alertas, status 'Pendente', atenção requerida." />
                                    <ColorSwatch name="Error" token="bg-rose-500" hex="Rose 500" usage="Erros críticos, deleção, status 'Vencido'." />
                                    <ColorSwatch name="Info" token="bg-blue-500" hex="Blue 500" usage="Informações neutras, links padrão." />
                                </div>
                            </section>
                        </div>
                    </div>
                )}

                {/* 3. TYPOGRAPHY */}
                {activeTab === 'typography' && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <SectionHeader title="Tipografia" description="Hierarquia visual baseada em Inter (UI) e JetBrains Mono (Dados). Contraste e legibilidade são prioridade." />

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                            <div className="space-y-6">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted border-b border-border pb-2">Headings & Displays</h3>
                                <div className="space-y-6">
                                    <div className="p-8 border border-border rounded-2xl bg-surface shadow-sm group hover:border-brand-main/30 transition-colors">
                                        <h1 className="text-5xl font-bold text-text-main mb-2 tracking-tight">Display H1</h1>
                                        <span className="text-xs font-mono text-text-muted bg-surface-sunken px-2 py-1 rounded">text-4xl / font-bold / tracking-tight</span>
                                    </div>
                                    <div className="p-8 border border-border rounded-2xl bg-surface shadow-sm group hover:border-brand-main/30 transition-colors">
                                        <h2 className="text-4xl font-bold text-text-main mb-2 tracking-tight">Heading H2</h2>
                                        <span className="text-xs font-mono text-text-muted bg-surface-sunken px-2 py-1 rounded">text-3xl / font-bold / tracking-tight</span>
                                    </div>
                                    <div className="p-6 border border-border rounded-2xl bg-surface shadow-sm group hover:border-brand-main/30 transition-colors">
                                        <h3 className="text-2xl font-bold text-text-main mb-2">Heading H3</h3>
                                        <span className="text-xs font-mono text-text-muted bg-surface-sunken px-2 py-1 rounded">text-2xl / font-bold</span>
                                    </div>
                                    <div className="p-6 border border-border rounded-2xl bg-surface shadow-sm group hover:border-brand-main/30 transition-colors">
                                        <h4 className="text-lg font-bold text-text-main mb-2">Heading H4</h4>
                                        <span className="text-xs font-mono text-text-muted bg-surface-sunken px-2 py-1 rounded">text-lg / font-bold</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted border-b border-border pb-2">Body & Utility</h3>
                                <div className="space-y-6">
                                    <div className="p-6 border border-border rounded-2xl bg-surface shadow-sm">
                                        <p className="text-base text-text-main mb-3 leading-relaxed">
                                            <strong>Body Regular:</strong> O sistema Parallax utiliza a fonte Inter para garantir legibilidade máxima em interfaces densas. O texto de corpo deve ter excelente contraste e altura de linha confortável.
                                        </p>
                                        <span className="text-xs font-mono text-text-muted bg-surface-sunken px-2 py-1 rounded">text-base / text-text-main</span>
                                    </div>
                                    <div className="p-6 border border-border rounded-2xl bg-surface shadow-sm">
                                        <p className="text-sm text-text-secondary mb-3">
                                            <strong>Small / Secondary:</strong> Usado para descrições, metadados e textos de apoio. Um pouco menor e com menos contraste, mas ainda legível.
                                        </p>
                                        <span className="text-xs font-mono text-text-muted bg-surface-sunken px-2 py-1 rounded">text-sm / text-text-secondary</span>
                                    </div>
                                    <div className="p-6 border border-border rounded-2xl bg-surface shadow-sm flex items-center justify-between">
                                        <p className="text-xs font-bold text-text-muted uppercase tracking-wider">
                                            Label / Overline / Badge
                                        </p>
                                        <span className="text-xs font-mono text-text-muted bg-surface-sunken px-2 py-1 rounded">text-xs / font-bold / uppercase</span>
                                    </div>
                                    <div className="p-6 border border-border rounded-2xl bg-surface shadow-sm flex items-center justify-between">
                                        <p className="text-base font-mono text-brand-text font-bold">
                                            R$ 1.250,00 <span className="text-text-muted font-normal">/ mês</span>
                                        </p>
                                        <span className="text-xs font-mono text-text-muted bg-surface-sunken px-2 py-1 rounded">font-mono (JetBrains Mono)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. LAYOUT */}
                {activeTab === 'layout' && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <SectionHeader title="Espaçamento & Grid" description="O ritmo vertical e horizontal da interface. Baseado em múltiplos de 4px." />

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                            <div className="bg-surface p-8 rounded-3xl border border-border">
                                <h3 className="font-bold mb-6 text-lg">Escala de Espaçamento (4px Base)</h3>
                                <div className="space-y-4">
                                    {[4, 8, 12, 16, 24, 32, 48, 64].map(size => (
                                        <div key={size} className="flex items-center gap-4 group">
                                            <div className="bg-brand-surface border border-brand-main/30 h-8 rounded-md flex items-center px-2 group-hover:bg-brand-main group-hover:border-brand-main transition-colors" style={{ width: size < 32 ? 'auto' : size, minWidth: size }}>
                                                {size >= 32 && <span className="text-[9px] text-brand-main group-hover:text-white font-mono mx-auto opacity-50 group-hover:opacity-100">{size}px</span>}
                                            </div>
                                            <span className="text-xs font-mono text-text-secondary group-hover:text-text-main">{size}px <span className="text-text-muted">(p-{size/4} / gap-{size/4})</span></span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-surface p-8 rounded-3xl border border-border">
                                <h3 className="font-bold mb-6 text-lg">Radius (Arredondamento)</h3>
                                <div className="flex flex-wrap gap-6">
                                    <div className="w-20 h-20 bg-surface-sunken border border-border rounded flex items-center justify-center text-[10px] font-mono text-text-muted">sm (2px)</div>
                                    <div className="w-20 h-20 bg-surface-sunken border border-border rounded-md flex items-center justify-center text-[10px] font-mono text-text-muted">md (6px)</div>
                                    <div className="w-20 h-20 bg-surface-sunken border border-border rounded-lg flex items-center justify-center text-[10px] font-mono text-text-muted">lg (8px)</div>
                                    <div className="w-20 h-20 bg-surface-sunken border border-border rounded-xl flex items-center justify-center text-[10px] font-mono text-text-muted font-bold text-brand-text ring-1 ring-brand-border/50">xl (12px)</div>
                                    <div className="w-20 h-20 bg-surface-sunken border border-border rounded-2xl flex items-center justify-center text-[10px] font-mono text-text-muted">2xl (16px)</div>
                                    <div className="w-20 h-20 bg-surface-sunken border border-border rounded-full flex items-center justify-center text-[10px] font-mono text-text-muted">full</div>
                                </div>
                                <div className="mt-8 p-4 bg-brand-surface/20 border border-brand-border/30 rounded-xl text-sm text-text-secondary">
                                    <strong>Padrão do Sistema:</strong> Use `rounded-xl` (12px) para cards e containers principais. Use `rounded-lg` (8px) para botões e inputs internos.
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 5. MOTION */}
                {activeTab === 'motion' && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <SectionHeader title="Motion & Interação" description="Animações funcionais que guiam o usuário, não apenas decorativas. Use transições rápidas (200-300ms) com curvas 'spring'." />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="bg-surface p-8 rounded-3xl border border-border flex flex-col items-center justify-center min-h-[240px] group">
                                <h3 className="font-bold mb-6 text-sm text-text-muted uppercase tracking-wider">Hover (Scale & Lift)</h3>
                                <button className="px-8 py-4 bg-surface border border-border rounded-xl hover:scale-[1.05] hover:shadow-lg transition-all duration-300 ease-spring font-bold text-text-main">
                                    Hover Me
                                </button>
                                <p className="text-[10px] text-text-muted mt-6 font-mono bg-surface-sunken px-2 py-1 rounded">transition-all duration-300 ease-spring</p>
                            </div>

                            <div className="bg-surface p-8 rounded-3xl border border-border flex flex-col items-center justify-center min-h-[240px]">
                                <h3 className="font-bold mb-6 text-sm text-text-muted uppercase tracking-wider">Fade In & Slide</h3>
                                <div key={Date.now()} className="w-full max-w-[200px] h-16 bg-brand-surface border border-brand-border rounded-xl animate-in fade-in slide-in-from-bottom-8 duration-700 flex items-center justify-center text-brand-text font-bold shadow-neon">
                                    Animate In
                                </div>
                                <p className="text-[10px] text-text-muted mt-6 font-mono bg-surface-sunken px-2 py-1 rounded">animate-in fade-in slide-in-from-bottom-4</p>
                            </div>

                            <div className="bg-surface p-8 rounded-3xl border border-border flex flex-col items-center justify-center min-h-[240px]">
                                <h3 className="font-bold mb-6 text-sm text-text-muted uppercase tracking-wider">Pulse (Status)</h3>
                                <div className="flex items-center gap-3 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                    <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Live Status</span>
                                </div>
                                <p className="text-[10px] text-text-muted mt-6 font-mono bg-surface-sunken px-2 py-1 rounded">animate-pulse</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 6. COMPONENTS */}
                {activeTab === 'components' && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <SectionHeader title="Biblioteca de Componentes" description="Blocos de construção fundamentais da UI. Consistência é chave." />

                        {/* Buttons */}
                        <section className="bg-surface border border-border rounded-3xl p-8">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-6">Botões</h3>
                            <div className="flex flex-wrap gap-4 items-center">
                                <button className="px-6 py-2.5 bg-brand-main hover:bg-brand-hover text-white font-bold rounded-xl shadow-lg shadow-brand-main/20 transition-all active:scale-95">
                                    Primary Action
                                </button>
                                <button className="px-6 py-2.5 bg-surface border border-border hover:bg-surface-hover text-text-main font-bold rounded-xl transition-all active:scale-95 shadow-sm">
                                    Secondary
                                </button>
                                <button className="px-6 py-2.5 bg-surface-sunken border border-border hover:bg-surface-active text-text-secondary font-bold rounded-xl transition-all active:scale-95">
                                    Ghost / Tertiary
                                </button>
                                <button className="px-6 py-2.5 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 font-bold rounded-xl transition-all active:scale-95">
                                    Destructive
                                </button>
                                <button className="p-2.5 bg-surface border border-border hover:bg-surface-hover rounded-lg transition-all active:scale-95 text-text-secondary">
                                    <Maximize size={20} />
                                </button>
                            </div>
                        </section>

                        {/* Inputs */}
                        <section className="bg-surface border border-border rounded-3xl p-8">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-6">Formulários & Inputs</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-text-muted uppercase">Input Padrão</label>
                                    <input type="text" placeholder="Digite algo..." className="w-full px-4 py-3 bg-surface-sunken border border-border rounded-xl text-sm focus:border-brand-main focus:ring-1 focus:ring-brand-main outline-none transition-all placeholder:text-text-faint" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-text-muted uppercase">Input com Ícone</label>
                                    <div className="relative group">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint group-focus-within:text-brand-main transition-colors w-4 h-4" />
                                        <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-3 bg-surface-sunken border border-border rounded-xl text-sm focus:border-brand-main focus:ring-1 focus:ring-brand-main outline-none transition-all placeholder:text-text-faint" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-text-muted uppercase">Select / Dropdown</label>
                                    <select className="w-full px-4 py-3 bg-surface-sunken border border-border rounded-xl text-sm focus:border-brand-main outline-none transition-all cursor-pointer text-text-main">
                                        <option>Opção 1</option>
                                        <option>Opção 2</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-text-muted uppercase">Toggles & Switches</label>
                                    <div className="flex gap-6 items-center h-full">
                                        <ToggleRight size={36} className="text-brand-main cursor-pointer hover:scale-105 transition-transform" />
                                        <ToggleLeft size={36} className="text-text-faint cursor-pointer hover:text-text-muted transition-colors" />
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                )}

                {/* 7. CARDS & WIDGETS */}
                {activeTab === 'cards' && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <SectionHeader title="Cards & Containers" description="Superfícies para agrupar conteúdo. O uso de bordas sutis e sombras leves é essencial." />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="bg-surface p-8 rounded-3xl border border-border shadow-sm hover:shadow-md transition-all">
                                <h4 className="font-bold text-text-main text-lg mb-2">Standard Card</h4>
                                <p className="text-sm text-text-secondary leading-relaxed">
                                    Surface padrão (white/dark). Borda sutil (`border-border`). Sombra pequena (`shadow-sm`).
                                    Ideal para dashboard e listas.
                                </p>
                            </div>
                            <div className="bg-surface p-8 rounded-3xl border border-brand-main/50 shadow-neon relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Zap size={48} /></div>
                                <h4 className="font-bold text-brand-text text-lg mb-2 relative z-10">Active / Selected Card</h4>
                                <p className="text-sm text-text-secondary leading-relaxed relative z-10">
                                    Borda da marca. Sombra neon. Usado para itens selecionados ou destaques (Planos, KPIs).
                                </p>
                            </div>
                            <div className="bg-surface-sunken p-8 rounded-3xl border border-border">
                                <h4 className="font-bold text-text-muted text-lg mb-2">Sunken Card</h4>
                                <p className="text-sm text-text-muted leading-relaxed">
                                    Fundo rebaixado (`bg-surface-sunken`). Para áreas secundárias, logs, configurações ou áreas de input agrupadas.
                                </p>
                            </div>
                        </div>

                        {/* Complex Examples */}
                        <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted border-b border-border pb-2 mt-8 mb-6">Componentes Complexos</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            
                            {/* Entity Card */}
                            <div className="bg-surface rounded-2xl border border-border p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow group">
                                <div className="w-14 h-14 rounded-full bg-violet-500 text-white flex items-center justify-center font-bold text-lg shadow-md group-hover:scale-105 transition-transform">
                                    BM
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-text-main text-base">Bruno Macedo</h4>
                                    <p className="text-sm text-text-secondary">Cabeleireiro • 68% Ocupação</p>
                                    <div className="flex gap-2 mt-2">
                                        <span className="px-2 py-0.5 bg-surface-sunken border border-border rounded text-[10px] font-bold text-text-muted">MANHÃ</span>
                                        <span className="px-2 py-0.5 bg-surface-sunken border border-border rounded text-[10px] font-bold text-text-muted">TARDE</span>
                                    </div>
                                </div>
                                <div className="p-2 bg-surface-sunken rounded-lg border border-border text-text-muted hover:text-text-main hover:bg-surface-hover cursor-pointer transition-colors">
                                    <MoreHorizontal size={20} />
                                </div>
                            </div>

                            {/* Alert/Status Card */}
                            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-5 flex gap-4">
                                <div className="p-2 bg-white/50 dark:bg-black/20 rounded-lg h-fit text-amber-600 dark:text-amber-500">
                                    <AlertTriangle size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-amber-800 dark:text-amber-400 text-sm uppercase tracking-wide mb-1">Atenção Necessária</h4>
                                    <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed">
                                        O estoque do produto <strong>Shampoo K-Pak</strong> está abaixo do nível mínimo. Reposição sugerida.
                                    </p>
                                </div>
                            </div>

                        </div>
                    </div>
                )}

                {/* 7. ADMIN UI */}
                {activeTab === 'admin' && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <SectionHeader title="Diretrizes do Console Admin" description="O Módulo Admin mantém a estrutura base do sistema, mas usa acentos semânticos distintos (Red/Rose) para indicar contexto administrativo de alto nível." />

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                            <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900/30 rounded-3xl p-10 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-5"><ShieldCheck size={120} /></div>
                                <h3 className="flex items-center gap-3 text-rose-700 dark:text-rose-400 font-bold text-2xl mb-6 relative z-10">
                                    <ShieldCheck size={28} /> Identidade Visual Admin
                                </h3>
                                <p className="text-base text-text-secondary mb-8 leading-relaxed relative z-10">
                                    Enquanto o cliente usa <strong>Cyan/Violet</strong>, o Admin usa <strong>Rose/Red</strong>. Isso ajuda o usuário a identificar imediatamente em qual contexto está operando (Client vs God Mode).
                                </p>
                                
                                <div className="space-y-4 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-rose-500 rounded-2xl shadow-lg flex items-center justify-center text-white font-bold text-xs">Accent</div>
                                        <div>
                                            <p className="font-bold text-text-main">Rose 500</p>
                                            <p className="text-xs text-text-muted">Ações primárias, logos, destaques.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center justify-center text-rose-600 font-bold text-xs">Surface</div>
                                        <div>
                                            <p className="font-bold text-text-main">Rose 50 / 900</p>
                                            <p className="text-xs text-text-muted">Fundos de cards e áreas de alerta.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-surface border border-border rounded-3xl p-10">
                                <h3 className="font-bold text-text-main text-xl mb-6">Regras de Uso (Do's & Don'ts)</h3>
                                <ul className="space-y-4">
                                    <li className="flex gap-3 items-start">
                                        <div className="mt-1 bg-emerald-100 text-emerald-600 rounded-full p-1"><Check size={12} strokeWidth={3} /></div>
                                        <div>
                                            <strong className="text-text-main block">Use Tokens Globais</strong>
                                            <p className="text-sm text-text-secondary">Mesmo no admin, use `bg-page`, `bg-surface`. Não hardcode cores de fundo.</p>
                                        </div>
                                    </li>
                                    <li className="flex gap-3 items-start">
                                        <div className="mt-1 bg-emerald-100 text-emerald-600 rounded-full p-1"><Check size={12} strokeWidth={3} /></div>
                                        <div>
                                            <strong className="text-text-main block">Destaque Ações Destrutivas</strong>
                                            <p className="text-sm text-text-secondary">Botões de "Banir", "Deletar" ou "Bloquear" devem ser explícitos.</p>
                                        </div>
                                    </li>
                                    <li className="flex gap-3 items-start">
                                        <div className="mt-1 bg-rose-100 text-rose-600 rounded-full p-1"><XCircle size={12} strokeWidth={3} /></div>
                                        <div>
                                            <strong className="text-text-main block">Não Misture Contextos</strong>
                                            <p className="text-sm text-text-secondary">Nunca use componentes Cyan (Cliente) dentro do layout Admin.</p>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* 8. ICONS */}
                {activeTab === 'icons' && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <SectionHeader title="Iconografia" description="Lucide React como base. Estilo de linha, 2px stroke (padrão). Consistência no peso visual." />

                        <div className="bg-surface border border-border rounded-3xl p-12 text-center">
                            <div className="flex flex-wrap justify-center gap-12 mb-12">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="p-6 bg-surface-sunken rounded-2xl border border-border"><Activity size={32} strokeWidth={2} className="text-text-main" /></div>
                                    <span className="text-xs font-mono text-text-muted">Activity</span>
                                </div>
                                <div className="flex flex-col items-center gap-4">
                                    <div className="p-6 bg-surface-sunken rounded-2xl border border-border"><Layers size={32} strokeWidth={2} className="text-brand-main" /></div>
                                    <span className="text-xs font-mono text-text-muted">Layers</span>
                                </div>
                                <div className="flex flex-col items-center gap-4">
                                    <div className="p-6 bg-surface-sunken rounded-2xl border border-border"><Zap size={32} strokeWidth={2} className="text-amber-500" /></div>
                                    <span className="text-xs font-mono text-text-muted">Zap</span>
                                </div>
                                <div className="flex flex-col items-center gap-4">
                                    <div className="p-6 bg-surface-sunken rounded-2xl border border-border"><Shield size={32} strokeWidth={2} className="text-emerald-500" /></div>
                                    <span className="text-xs font-mono text-text-muted">Shield</span>
                                </div>
                                <div className="flex flex-col items-center gap-4">
                                    <div className="p-6 bg-surface-sunken rounded-2xl border border-border"><Bell size={32} strokeWidth={2} className="text-rose-500" /></div>
                                    <span className="text-xs font-mono text-text-muted">Bell</span>
                                </div>
                            </div>
                            
                            <div className="max-w-2xl mx-auto text-left bg-surface-sunken p-6 rounded-xl border border-border">
                                <h4 className="text-text-main font-bold mb-4">Regras de Implementação</h4>
                                <ul className="space-y-2 text-sm text-text-secondary list-disc pl-4">
                                    <li><strong>Biblioteca:</strong> Apenas <code>lucide-react</code>.</li>
                                    <li><strong>Stroke Width:</strong> 2px para tamanhos normais (16-24px). 1.5px para tamanhos grandes (32px+).</li>
                                    <li><strong>Cores:</strong> Herdar do texto (currentColor) ou usar cores semânticas (text-brand-main, text-rose-500).</li>
                                    <li><strong>Variações:</strong> Evite ícones preenchidos (fill), exceto para estados ativos específicos (ex: estrela de favorito).</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* 9. LAYOUTS & HUBS */}
                {activeTab === 'layouts' && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <SectionHeader title="Padrões de Layout" description="Estruturas recorrentes que definem a navegação e hierarquia do sistema." />

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                            {/* HUB LAYOUT */}
                            <div className="space-y-6">
                                <h3 className="text-xl font-bold text-text-main flex items-center gap-3">
                                    <div className="p-2 bg-brand-surface rounded-lg text-brand-main"><Layout size={20} /></div>
                                    Hub Layout (Dashboard Pattern)
                                </h3>
                                <p className="text-sm text-text-secondary">
                                    Utilizado nos módulos principais (Clientes, Produtos, Equipe). Composto por cabeçalho com KPIs, toolbar fixo e área de conteúdo em lista ou grid.
                                </p>
                                
                                <div className="border border-border rounded-2xl overflow-hidden bg-page shadow-sm aspect-video flex flex-col">
                                    {/* Header */}
                                    <div className="p-4 bg-surface border-b border-border space-y-3">
                                        <div className="h-4 w-1/3 bg-brand-main/20 rounded"></div>
                                        <div className="flex gap-2">
                                            <div className="h-16 flex-1 bg-surface-sunken rounded border border-border"></div>
                                            <div className="h-16 flex-1 bg-surface-sunken rounded border border-border"></div>
                                            <div className="h-16 flex-1 bg-surface-sunken rounded border border-border"></div>
                                        </div>
                                    </div>
                                    {/* Sticky Toolbar */}
                                    <div className="p-2 bg-surface/90 border-b border-border sticky top-0 flex gap-2 backdrop-blur-sm z-10">
                                        <div className="h-8 flex-1 bg-surface-sunken rounded border border-border"></div>
                                        <div className="h-8 w-8 bg-surface-sunken rounded border border-border"></div>
                                    </div>
                                    {/* Content */}
                                    <div className="flex-1 bg-surface-sunken/30 p-4 space-y-2 overflow-hidden">
                                        <div className="h-12 w-full bg-surface rounded border border-border shadow-sm"></div>
                                        <div className="h-12 w-full bg-surface rounded border border-border shadow-sm"></div>
                                        <div className="h-12 w-full bg-surface rounded border border-border shadow-sm"></div>
                                        <div className="h-12 w-full bg-surface rounded border border-border shadow-sm"></div>
                                    </div>
                                </div>
                            </div>

                            {/* AGENDA LAYOUT */}
                            <div className="space-y-6">
                                <h3 className="text-xl font-bold text-text-main flex items-center gap-3">
                                    <div className="p-2 bg-brand-surface rounded-lg text-brand-main"><Calendar size={20} /></div>
                                    Agenda Layout (Complex Grid)
                                </h3>
                                <p className="text-sm text-text-secondary">
                                    Layout complexo com múltiplos eixos de scroll independentes, áreas fixas e headers sincronizados.
                                </p>
                                
                                <div className="border border-border rounded-2xl overflow-hidden bg-page shadow-sm aspect-video flex">
                                    {/* Sidebar */}
                                    <div className="w-16 bg-surface border-r border-border p-2 space-y-2 shrink-0">
                                        <div className="h-8 w-full bg-surface-sunken rounded"></div>
                                        <div className="h-full w-full bg-surface-sunken rounded"></div>
                                    </div>
                                    {/* Main */}
                                    <div className="flex-1 flex flex-col min-w-0">
                                        {/* Topbar */}
                                        <div className="h-12 bg-surface border-b border-border shrink-0"></div>
                                        {/* Resource Header */}
                                        <div className="h-10 bg-surface border-b border-border flex shrink-0">
                                            <div className="w-12 border-r border-border"></div>
                                            <div className="flex-1 bg-surface-sunken border-r border-border"></div>
                                            <div className="flex-1 bg-surface-sunken border-r border-border"></div>
                                            <div className="flex-1 bg-surface-sunken"></div>
                                        </div>
                                        {/* Grid */}
                                        <div className="flex-1 flex bg-surface-sunken relative overflow-hidden">
                                            <div className="w-12 bg-surface border-r border-border h-full shrink-0"></div>
                                            <div className="flex-1 bg-[linear-gradient(var(--border-subtle)_1px,transparent_1px)] bg-[size:100%_20px]"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 11. TABELAS & LISTAS */}
                {activeTab === 'tables' && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <SectionHeader title="Tabelas de Dados" description="Padrão para exibição densa de informações em listas administrativas." />

                        <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
                            {/* Toolbar Mock */}
                            <div className="p-4 border-b border-border bg-surface flex flex-wrap justify-between items-center gap-4">
                                <div className="flex gap-2">
                                    <div className="bg-surface-sunken px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-text-secondary flex items-center gap-2 hover:bg-surface-hover cursor-pointer transition-colors">
                                        <Filter size={14} /> Filtros
                                    </div>
                                    <div className="bg-surface-sunken px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-text-secondary hover:bg-surface-hover cursor-pointer transition-colors">
                                        Ordenar: Data
                                    </div>
                                </div>
                                <button className="text-xs font-bold text-brand-text hover:bg-brand-surface px-3 py-1.5 rounded transition-colors">Exportar CSV</button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-surface-sunken border-b border-border text-[10px] uppercase font-bold text-text-muted tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4 w-10">
                                                <div className="w-4 h-4 border border-border rounded bg-surface"></div>
                                            </th>
                                            <th className="px-6 py-4">Entidade Principal</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Categoria</th>
                                            <th className="px-6 py-4 text-right">Valor / Info</th>
                                            <th className="px-6 py-4 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {[1, 2, 3].map((i) => (
                                            <tr key={i} className="group hover:bg-surface-hover transition-colors cursor-pointer">
                                                <td className="px-6 py-4">
                                                    <div className="w-4 h-4 border border-border rounded bg-surface group-hover:border-brand-main transition-colors"></div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-surface-active border border-border flex items-center justify-center text-xs font-bold text-text-secondary shadow-sm">
                                                            AB
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-text-main group-hover:text-brand-text transition-colors">Ana Beatriz</div>
                                                            <div className="text-xs text-text-muted">ana@email.com</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                        Ativo
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs text-text-secondary font-medium px-2 py-1 bg-surface-sunken rounded border border-border">Cliente Recorrente</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="font-mono font-bold text-text-main">R$ 1.250,00</div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <ArrowUpRight size={16} className="text-text-faint group-hover:text-brand-main opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Pagination Mock */}
                            <div className="p-4 border-t border-border bg-surface-sunken/30 flex justify-between items-center text-xs text-text-muted">
                                <span>Mostrando 1-3 de 45</span>
                                <div className="flex gap-2">
                                    <button className="px-3 py-1.5 border border-border rounded-lg bg-surface hover:bg-surface-hover font-medium transition-colors">Anterior</button>
                                    <button className="px-3 py-1.5 border border-border rounded-lg bg-surface hover:bg-surface-hover font-medium transition-colors">Próximo</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 12. TOKENS */}
                {activeTab === 'tokens' && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <SectionHeader title="Design Tokens (Referência Técnica)" description="Mapeamento direto para variáveis CSS e classes Tailwind. Esta é a fonte da verdade para engenharia." />

                        <div className="bg-surface border border-border rounded-3xl overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                                <thead className="bg-surface-sunken border-b border-border">
                                    <tr>
                                        <th className="py-4 px-6 text-xs font-bold uppercase text-text-muted">Token Name</th>
                                        <th className="py-4 px-6 text-xs font-bold uppercase text-text-muted">Valor (Tailwind/CSS)</th>
                                        <th className="py-4 px-6 text-xs font-bold uppercase text-text-muted">Finalidade</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <TokenRow name="bg-page" value="var(--bg-page)" usage="Fundo global da aplicação (#f0f4f8 em Light)" />
                                    <TokenRow name="bg-surface" value="var(--bg-surface)" usage="Fundo de cards e containers (White)" />
                                    <TokenRow name="bg-surface-sunken" value="var(--bg-surface-sunken)" usage="Fundo rebaixado (inputs, headers)" />
                                    <TokenRow name="text-main" value="var(--text-main)" usage="Texto primário (alto contraste)" />
                                    <TokenRow name="text-secondary" value="var(--text-secondary)" usage="Texto secundário (médio contraste)" />
                                    <TokenRow name="text-muted" value="var(--text-muted)" usage="Texto terciário / labels" />
                                    <TokenRow name="border-border" value="var(--border-subtle)" usage="Bordas padrão" />
                                    <TokenRow name="brand-main" value="var(--brand-main)" usage="Cor primária da marca" />
                                    <TokenRow name="shadow-neon" value="0 0 12px var(--brand-dim)..." usage="Glow para elementos ativos" />
                                    <TokenRow name="ease-spring" value="cubic-bezier(0.16, 1, 0.3, 1)" usage="Curva de animação padrão" />
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 13. GUIDELINES */}
                {activeTab === 'guidelines' && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <SectionHeader title="Diretrizes Globais" description="Princípios para manter a consistência e escalabilidade." />

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                            <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-3xl p-8">
                                <h3 className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400 font-bold text-xl mb-6">
                                    <CheckCircle2 size={24} /> O que fazer (Do's)
                                </h3>
                                <ul className="space-y-4 text-sm text-text-secondary">
                                    <li className="flex gap-3"><div className="mt-1"><Check size={16} className="text-emerald-500" /></div> <span>Use sempre componentes base do <code>/components</code> para manter a consistência.</span></li>
                                    <li className="flex gap-3"><div className="mt-1"><Check size={16} className="text-emerald-500" /></div> <span>Utilize o hook <code>useDataView</code> para mocks e chamadas de dados.</span></li>
                                    <li className="flex gap-3"><div className="mt-1"><Check size={16} className="text-emerald-500" /></div> <span>Mantenha o espaçamento consistente (múltiplos de 4px).</span></li>
                                    <li className="flex gap-3"><div className="mt-1"><Check size={16} className="text-emerald-500" /></div> <span>Use `text-text-secondary` para descrições longas para reduzir a carga cognitiva.</span></li>
                                    <li className="flex gap-3"><div className="mt-1"><Check size={16} className="text-emerald-500" /></div> <span>Verifique o modo escuro a cada nova tela desenvolvida.</span></li>
                                </ul>
                            </div>

                            <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800 rounded-3xl p-8">
                                <h3 className="flex items-center gap-3 text-rose-700 dark:text-rose-400 font-bold text-xl mb-6">
                                    <XCircle size={24} /> O que não fazer (Don'ts)
                                </h3>
                                <ul className="space-y-4 text-sm text-text-secondary">
                                    <li className="flex gap-3"><div className="mt-1"><Copy size={16} className="text-rose-500" /></div> <span>Não use cores hexadecimais (ex: #fff) diretamente no CSS/Tailwind.</span></li>
                                    <li className="flex gap-3"><div className="mt-1"><Copy size={16} className="text-rose-500" /></div> <span>Não crie novos tamanhos de fonte arbitrários fora da escala.</span></li>
                                    <li className="flex gap-3"><div className="mt-1"><Copy size={16} className="text-rose-500" /></div> <span>Não misture estilos de ícones (fill vs outline) na mesma interface.</span></li>
                                    <li className="flex gap-3"><div className="mt-1"><Copy size={16} className="text-rose-500" /></div> <span>Evite sombras pesadas (drop-shadow); prefira bordas sutis e sombras de elevação (shadow-sm/float).</span></li>
                                    <li className="flex gap-3"><div className="mt-1"><Copy size={16} className="text-rose-500" /></div> <span>Não delete código legado sem verificar dependências cruzadas.</span></li>
                                </ul>
                            </div>
                        </div>

                        <div className="p-8 bg-surface-sunken border border-border rounded-3xl flex items-start gap-4">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg shrink-0">
                                <Info size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-text-main text-lg mb-2">Nota para Agentes (Antigravity)</h3>
                                <p className="text-sm text-text-secondary leading-relaxed">
                                    Ao gerar novas telas, consulte sempre a aba <strong>Tokens</strong> e <strong>Componentes UI</strong>. 
                                    A consistência visual é prioritária. Use o componente <code>ParallaxOrb</code> para estados de loading e IA.
                                    Esta documentação é a fonte da verdade absoluta.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
      </main>
    </div>
  );
};