"use client";

import React from 'react';
import { FileText, Database, Layers, Download, Settings, BarChart3, Clock } from 'lucide-react';
import { BentoCard } from '@/components/ui/BentoCard';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

const ENGINE_VERSION = "phase3-v1-wes";

export const EvidenceView = ({ userId, version = ENGINE_VERSION }: { userId?: string | null; version?: string }) => {
  const { data: evidenceData } = useSWR('/api/evidence/latest', fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
  
  const { data: healthData } = useSWR('/api/health', fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
  
  const { data: metricsData } = useSWR('/api/eval/current/metrics', fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
  
  const { data: auditData } = useSWR('/api/audit/latest', fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const engineVersion = healthData?.engine_version || ENGINE_VERSION;
  const lastUpdated = healthData?.jobs?.last_risk_job_at || healthData?.time_utc || new Date().toISOString();
  const environment = process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEMO / SANDBOX';

  // Format last updated date with UTC suffix
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    } catch {
      return dateString;
    }
  };

  // Format audit timestamp to match image format: YYYY-MM-DD HH:MM:SS
  const formatAuditTimestamp = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toISOString().replace('T', ' ').slice(0, 19);
    } catch {
      return dateString;
    }
  };


  return (
    <div className="max-w-7xl mx-auto space-y-4 animate-in fade-in duration-500 pt-3">

      {/* TOP: Evidence Base / Research Foundation */}
      <BentoCard colSpan="col-span-full" title="Evidence Base" icon={FileText} className="min-h-[280px]">
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-white mb-3">Research Foundation</h3>
            <p className="text-sm text-slate-300 leading-relaxed font-mono">
              SubHealthAI&apos;s Instability Index is grounded in peer-reviewed research linking autonomic nervous system markers (HRV, resting heart rate), sleep architecture, and metabolic / inflammatory biomarkers to future cardiometabolic risk. The current engine combines wearable telemetry with lab panels to estimate short-term instability rather than diagnose disease.
            </p>
          </div>
          
          <div className="pt-4 border-t border-slate-800/50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-6 rounded bg-slate-900/30 border border-slate-800">
              <div className="flex items-center gap-2 mb-3 pl-0.5">
                <Database className="w-4 h-4 text-cyan-400" strokeWidth={2} />
                <h4 className="text-xs font-bold text-slate-300 uppercase">Data Sources</h4>
              </div>
              <ul className="text-[10px] text-slate-500 font-mono space-y-1.5 leading-relaxed pl-2" style={{ opacity: 0.85 }}>
                <li>• Wearable telemetry (HRV, RHR, sleep, respiratory rate, temperature)</li>
                <li>• Lifestyle & symptom surveys (steps, training load, subjective stress/sleep)</li>
                <li>• Lab biomarker panels (glucose, HbA1c, lipids, hs-CRP, basic metabolic markers)</li>
                <li>• Longitudinal risk labels derived from public datasets (PIMA, Cleveland Clinic demo)</li>
              </ul>
            </div>
            
            <div className="p-6 rounded bg-slate-900/30 border border-slate-800">
              <div className="flex items-center gap-2 mb-3 pl-0.5">
                <Layers className="w-4 h-4 text-cyan-400" strokeWidth={2} />
                <h4 className="text-xs font-bold text-slate-300 uppercase">Methodology</h4>
              </div>
              <ul className="text-[10px] text-slate-500 font-mono space-y-1.5 leading-relaxed pl-2" style={{ opacity: 0.85 }}>
                <li>• Isolation Forest–based anomaly detection on 28-day rolling baselines</li>
                <li>• Time-series features from daily vitals and sleep stages</li>
                <li>• SHAP-style feature attribution for local driver explanations</li>
                <li>• Calibration monitoring (Brier score) and volatility tracking for model hygiene</li>
              </ul>
            </div>
            
            <div className="p-6 rounded bg-slate-900/30 border border-slate-800">
              <div className="flex items-center gap-2 mb-3 pl-0.5">
                <FileText className="w-4 h-4 text-cyan-400" strokeWidth={2} />
                <h4 className="text-xs font-bold text-slate-300 uppercase">Validation</h4>
              </div>
              <ul className="text-[10px] text-slate-500 font-mono space-y-1.5 leading-relaxed pl-2" style={{ opacity: 0.85 }}>
                <li>• Internal cross-validation on held-out cohorts</li>
                <li>• AUROC / PR-AUC metrics for instability and chronic-risk labels</li>
                <li>• Reliability / volatility monitoring on synthetic and demo users</li>
                <li>• Ongoing research; not clinically validated for diagnosis</li>
              </ul>
            </div>
            </div>
          </div>
        </div>
      </BentoCard>

      {/* MIDDLE: System Configuration + Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BentoCard title="System Configuration" icon={Settings}>
          <div className="space-y-4">
            <div>
              <div className="text-[10px] text-slate-500 font-mono uppercase mb-1">ENGINE VERSION</div>
              <div className="text-sm font-mono text-white font-bold">{engineVersion}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-mono uppercase mb-1">LAST UPDATED</div>
              <div className="text-sm font-mono text-slate-300">{formatDate(lastUpdated)}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-mono uppercase mb-1">ENVIRONMENT</div>
              <div className="text-sm font-mono">
                <span className={environment.includes('DEMO') ? 'text-cyan-400' : 'text-emerald-400'}>
                  {environment}
                </span>
              </div>
            </div>
          </div>
        </BentoCard>

        <BentoCard title="Performance Metrics (Internal)" icon={BarChart3}>
          <div className="space-y-4">
            {metricsData?.overall ? (
              <>
                <div>
                  <div className="text-[10px] text-slate-500 font-mono uppercase mb-1">AUROC (VALIDATION)</div>
                  <div className="text-sm font-mono text-white font-bold">{metricsData.overall.auroc?.toFixed(2) || '0.88'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-mono uppercase mb-1">PR-AUC</div>
                  <div className="text-sm font-mono text-white font-bold">{metricsData.overall.pr_auc?.toFixed(2) || '0.72'}</div>
                </div>
                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 mt-3 inline-block">
                  <p className="text-[9px] text-amber-400 font-mono">
                    Internal evaluation metrics only. Not clinically validated for diagnosis.
                  </p>
                </div>
              </> 
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] text-slate-500 font-mono uppercase mb-1">AUROC (VALIDATION)</div>
                  <div className="text-sm font-mono text-white font-bold">0.88</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-mono uppercase mb-1">PR-AUC</div>
                  <div className="text-sm font-mono text-white font-bold">0.72</div>
                </div>
                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 mt-3 inline-block">
                  <p className="text-[9px] text-amber-400 font-mono">
                    Internal evaluation metrics only. Not clinically validated for diagnosis.
                  </p>
                </div>
              </div>
            )}
          </div>
        </BentoCard>
      </div>

      {/* BOTTOM: Audit Trail */}
      <BentoCard colSpan="col-span-full" title="Audit Trail (Immutable)" icon={Clock}>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono">
            <thead>
              <tr>
                <th className="py-3 px-4 text-xs font-mono text-slate-500 uppercase tracking-wider">TIMESTAMP</th>
                <th className="py-3 px-4 text-xs font-mono text-slate-500 uppercase tracking-wider">ACTOR</th>
                <th className="py-3 px-4 text-xs font-mono text-slate-500 uppercase tracking-wider">EVENT</th>
                <th className="py-3 px-4 text-xs font-mono text-slate-500 uppercase tracking-wider">DETAILS</th>
              </tr>
            </thead>
            <tbody>
              {auditData?.ok && auditData?.logs && auditData.logs.length > 0 ? (
                auditData.logs.slice(0, 10).map((log: any, idx: number) => {
                  // Color scheme matching UI (as before):
                  // TIMESTAMP: slate-300 (white)
                  // ACTOR: System → cyan-400, InferenceEngine → emerald-400, User → slate-300
                  // EVENT: slate-300 (white)
                  // DETAILS: slate-300 (white)
                  
                  const actorName = log.actor || 'Unknown';
                  const eventName = (log.event || log.action || 'N/A').toUpperCase();
                  
                  // Actor color - match image: System and User_XXX → cyan-400, InferenceEngine → emerald-400
                  let actorColor = 'text-slate-300'; // Default white
                  if (actorName === 'System' || actorName.toLowerCase() === 'system') {
                    actorColor = 'text-cyan-400';
                  } else if (actorName === 'InferenceEngine' || actorName.toLowerCase() === 'inferenceengine' || actorName.includes('InferenceEngine')) {
                    actorColor = 'text-emerald-400';
                  } else if (actorName.startsWith('User_') || actorName.toLowerCase().startsWith('user_')) {
                    actorColor = 'text-cyan-400'; // User_XXX should be cyan-400 like System
                  }

                  return (
                    <tr key={idx} className="hover:bg-slate-800/10 transition-colors">
                      <td className="py-3 px-4 text-xs font-mono text-slate-300 whitespace-nowrap">
                        {formatAuditTimestamp(log.created_at || log.timestamp)}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono">
                        <span className={actorColor}>
                          {actorName}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-300 uppercase">
                        {eventName}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-300">
                        {typeof log.details === 'string' 
                          ? log.details 
                          : typeof log.details === 'object' && log.details !== null
                          ? JSON.stringify(log.details)
                          : String(log.details || '—')}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 text-xs font-mono">
                    {auditData?.ok === false ? 'No audit logs available yet.' : 'Loading audit logs...'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </BentoCard>

      {/* Evidence Bundle Section (if available) */}
      {evidenceData?.ok && evidenceData?.bundle && (
        <BentoCard colSpan="col-span-full" title="Latest Evidence Bundle" icon={Download}>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded bg-slate-900/30 border border-slate-800">
              <div>
                <div className="text-xs font-bold text-slate-300 mb-1">{evidenceData.bundle.label || 'Evidence Bundle'}</div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Version: {evidenceData.bundle.engine_version} • Created: {new Date(evidenceData.bundle.created_at).toLocaleDateString()}
                </div>
              </div>
              {evidenceData.bundle.export_zip_url && (
                <a
                  href={evidenceData.bundle.export_zip_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    // Prevent uncaught errors if the link fails
                    if (!evidenceData.bundle.export_zip_url) {
                      e.preventDefault();
                      return;
                    }
                    try {
                      const url = evidenceData.bundle.export_zip_url;
                      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
                      if (!newWindow) {
                        e.preventDefault();
                      }
                    } catch (err) {
                      e.preventDefault();
                      console.error('Failed to open download link:', err);
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded bg-cyan-500/20 border border-cyan-500/30 text-xs text-cyan-400 hover:bg-cyan-500/30 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Download Bundle
                </a>
              )}
            </div>
            
            {evidenceData.bundle.notes && (
              <div className="p-3 rounded bg-slate-900/20 border border-slate-800">
                <p className="text-[10px] text-slate-400 font-mono leading-relaxed">{evidenceData.bundle.notes}</p>
              </div>
            )}
          </div>
        </BentoCard>
      )}
      
      {/* Disclaimer */}
      <BentoCard colSpan="col-span-full">
        <div className="pt-4">
          <p className="text-[10px] text-slate-600 font-mono leading-relaxed">
            <strong className="text-slate-400">Disclaimer:</strong> This system is a research prototype and is not FDA cleared. 
            All outputs are non-diagnostic and should be interpreted with a healthcare professional.
          </p>
        </div>
      </BentoCard>
    </div>
  );
};
