export default function Badge({ kind='neutral', children }:{
    kind?: 'ai'|'fallback'|'neutral', children: React.ReactNode
  }) {
    const styles = {
      ai:       'bg-emerald-100 text-emerald-800 border-emerald-200',
      fallback: 'bg-amber-100 text-amber-800 border-amber-200',
      neutral:  'bg-gray-100 text-gray-800 border-gray-200'
    }[kind];
    return <span className={`inline-block rounded-full border px-2 py-0.5 text-xs ${styles}`}>{children}</span>;
  }
  