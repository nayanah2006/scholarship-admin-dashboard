import React, { useState, useEffect } from 'react';
import {
  Lightbulb,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  FileText,
  ShieldAlert,
  ArrowRight,
  Info
} from 'lucide-react';
import {
  Card,
  Button,
  LoadingState,
  ErrorState,
  EmptyState,
  Alert
} from '../../components/ui/DesignSystem';

export function GovernmentInsightsView({ api, fail }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadInsights = async () => {
    setLoading(true);
    try {
      const res = await api('/api/government/insights');
      setData(res);
    } catch (err) {
      fail(err.message || 'Failed to generate district insights.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, []);

  if (loading) {
    return <LoadingState message="Generating deterministic statistical district insights…" />;
  }

  if (!data) {
    return <EmptyState message="No district insights could be computed." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900">AI & Statistical District Insights</h1>
            <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
              Deterministic Engine
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Automated hypothesis generator analyzing coverage benchmarks, pending claims ratios, and institution participation.
          </p>
        </div>

        <Button onClick={loadInsights} variant="outline" size="sm">
          Recompute Benchmarks
        </Button>
      </div>

      {/* State Benchmarks Card */}
      <Card
        title="Statewide Benchmarks & Distribution Parameters"
        subtitle="Normative statistical baselines calculated across all 32 Karnataka districts"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
            <span className="text-slate-500 uppercase font-semibold text-[10px]">Districts Tracked</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{data.stateBenchmarks?.districtsTracked || 32}</p>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 text-xs">
            <span className="text-indigo-700 uppercase font-semibold text-[10px]">Average Coverage Benchmark</span>
            <p className="text-2xl font-extrabold text-indigo-900 mt-1">{data.stateBenchmarks?.coverageMean || 0}%</p>
            <span className="text-[10px] text-indigo-600">Std Dev: ±{data.stateBenchmarks?.coverageSD || 0}%</span>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3.5 text-xs">
            <span className="text-amber-700 uppercase font-semibold text-[10px]">Pending Share Mean</span>
            <p className="text-2xl font-extrabold text-amber-900 mt-1">{data.stateBenchmarks?.pendingShareMean || 0}%</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5 text-xs">
            <span className="text-emerald-700 uppercase font-semibold text-[10px]">Claims / Institution Mean</span>
            <p className="text-2xl font-extrabold text-emerald-900 mt-1">{data.stateBenchmarks?.claimsPerInstitutionMean || 0}</p>
          </div>
        </div>

        {data.portalDocumentCorrectionRate && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-xs text-amber-900 flex items-center gap-2">
            <Info size={16} className="shrink-0 text-amber-700" />
            <span>
              Portal Document Correction Rate: <b>{data.portalDocumentCorrectionRate.correctedOrRejected}</b> of{' '}
              <b>{data.portalDocumentCorrectionRate.totalDocuments}</b> documents required correction or reupload (
              {(
                (data.portalDocumentCorrectionRate.correctedOrRejected /
                  (data.portalDocumentCorrectionRate.totalDocuments || 1)) *
                100
              ).toFixed(1)}
              %).
            </span>
          </div>
        )}
      </Card>

      {/* District Hypotheses List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Per-District Statistical Hypotheses</h2>
        {data.districts && data.districts.length > 0 ? (
          data.districts.map((d) => (
            <Card key={d.district} title={`District Analysis: ${d.district}`}>
              <div className="space-y-4 text-xs">
                {/* Facts */}
                <div>
                  <h4 className="font-bold text-slate-700 uppercase tracking-wide text-[11px] mb-2">
                    Observed Database Facts
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {d.facts.map((f, i) => (
                      <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                        <span className="font-semibold text-slate-800">{f.label}: </span>
                        <span className="font-bold text-indigo-700">{f.value}</span>
                        <p className="mt-0.5 text-slate-500 text-[11px]">{f.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hypotheses */}
                {d.hypotheses && d.hypotheses.length > 0 && (
                  <div>
                    <h4 className="font-bold text-amber-800 uppercase tracking-wide text-[11px] mb-2">
                      Generated Contributing Hypotheses (Requires Verification)
                    </h4>
                    <div className="space-y-2">
                      {d.hypotheses.map((h, i) => (
                        <div key={i} className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{h.title}</span>
                            <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">
                              Confidence: {h.confidence >= 0.7 ? 'High' : h.confidence >= 0.5 ? 'Medium' : 'Low'}
                            </span>
                          </div>
                          <ul className="mt-2 list-inside list-disc text-slate-700 space-y-1">
                            {h.evidence.map((ev, j) => (
                              <li key={j}>{ev}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Actions */}
                {d.suggestedActions && d.suggestedActions.length > 0 && (
                  <div>
                    <h4 className="font-bold text-indigo-800 uppercase tracking-wide text-[11px] mb-1.5">
                      Suggested Officer Actions
                    </h4>
                    <ul className="list-inside list-disc space-y-1 text-slate-700">
                      {d.suggestedActions.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          ))
        ) : (
          <Card>
            <p className="text-xs text-slate-500">
              No anomaly hypotheses triggered for the current portal dataset. All districts are within expected benchmark deviations.
            </p>
          </Card>
        )}
      </div>

      {/* Methodology & Notes */}
      <Card title="Engine Methodology & Limitations">
        <div className="space-y-2 text-xs text-slate-600">
          {data.notes?.map((n, i) => (
            <p key={i} className="flex items-start gap-1.5">
              <span className="text-indigo-600">•</span>
              <span>{n}</span>
            </p>
          ))}
          {data.unavailable && data.unavailable.length > 0 && (
            <p className="pt-2 text-amber-800 font-medium">
              Unavailable data dimensions: {data.unavailable.join('; ')}.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
