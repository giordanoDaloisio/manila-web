import { useState } from "react";
import { UploadCloud, Database, X, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWizard } from "@/context/WizardContext";
import { BUILTIN_DATASETS } from "@/lib/fairbench";
import { uploadDataset, selectBuiltinDataset, analyzeDataset } from "@/lib/api";

export default function Step1Dataset() {
  const { state, update, updateDataset, updateValidation } = useWizard();
  const ds = state.dataset;
  const [uploadedName, setUploadedName] = useState(ds.source === "upload" ? ds.name : "");
  const [uploading, setUploading] = useState(false);

  const alignOptionsToTarget = (profile) => {
    const isBinaryClassification = profile.task_type === "classification" && profile.n_classes === 2;
    const patch = { task_type: profile.task_type, models: [] };
    if (!isBinaryClassification) {
      patch.fairness_enabled = false;
      patch.fairness_methods = [];
      patch.fairness_metrics = [];
      patch.bias_scope = null;
      patch.group_treatment = null;
      patch.graph_options = (state.graph_options || []).filter((option) => option !== "fairness_gaps");
    }
    update(patch);
    if (profile.task_type === "regression" && state.validation.method === "stratified_kfold") updateValidation({ method: "kfold" });
  };

  const selectBuiltin = async (id) => {
    const d = BUILTIN_DATASETS.find((x) => x.id === id);
    if (!d) return;
    setUploading(true);
    try {
      const result = await selectBuiltinDataset(id);
      alignOptionsToTarget(result.profile);
      updateDataset({
        source: "builtin", dataset_id: id, dataset_path: result.dataset_path,
        name: result.name, label_column: result.label_column,
        positive_label: "",
        target_values: result.target_values?.map(String) || [],
        sensitive_attrs: result.sensitive_attrs, columns: result.columns,
        preview: result.preview, profile: result.profile, model_compatibility: result.models,
      });
      setUploadedName("");
    } catch (e) {
      toast.error("Could not prepare dataset", { description: e?.response?.data?.detail || e.message });
    } finally {
      setUploading(false);
    }
  };

  const changeLabel = async (labelColumn) => {
    updateDataset({ label_column: labelColumn });
    if (!ds.dataset_id) return;
    try {
      const result = await analyzeDataset(ds.dataset_id, labelColumn, ds.sensitive_attrs);
      alignOptionsToTarget(result.profile);
      updateDataset({
        profile: result.profile,
        model_compatibility: result.models,
        positive_label: "",
        target_values: result.target_values?.map(String) || [],
      });
    } catch (e) {
      toast.error("Could not analyze target column", { description: e?.response?.data?.detail || e.message });
    }
  };

  const handleFile = async (file) => {
    if (!file) return;
    const MAX_BYTES = 50 * 1024 * 1024; // keep in sync with backend MAX_UPLOAD_BYTES
    if (file.size > MAX_BYTES) {
      toast.error("File too large", {
        description: `${(file.size / 1024 / 1024).toFixed(1)} MB exceeds the 50 MB limit.`,
      });
      return;
    }
    setUploading(true);
    try {
      const result = await uploadDataset(file);
      alignOptionsToTarget(result.profile);
      updateDataset({
        source: "upload",
        dataset_id: result.dataset_id,
        name: result.name,
        label_column: "",
        positive_label: "",
        sensitive_attrs: [],
        columns: result.columns,
        target_values: result.target_values?.map(String) || [],
        preview: result.preview,
        dataset_path: result.dataset_path,
        profile: result.profile,
        model_compatibility: result.models,
      });
      setUploadedName(result.name);
      toast.success(`Uploaded ${result.name}`, {
        description: `${result.row_count.toLocaleString()} rows · ${result.columns.length} columns parsed`,
      });
    } catch (e) {
      toast.error("Upload failed", {
        description: e?.response?.data?.detail || e.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const toggleSensitive = async (col) => {
    const has = ds.sensitive_attrs.includes(col);
    const next = has ? ds.sensitive_attrs.filter((c) => c !== col) : [...ds.sensitive_attrs, col];
    updateDataset({
      sensitive_attrs: next,
    });
    if (!ds.dataset_id || !ds.label_column) return;
    try {
      const result = await analyzeDataset(ds.dataset_id, ds.label_column, next);
      updateDataset({ profile: result.profile, model_compatibility: result.models });
    } catch (error) {
      toast.error("Could not analyze protected-group support", { description: error?.response?.data?.detail || error.message });
    }
  };

  return (
    <div data-testid="step-1-dataset">
      <div className="mb-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-teal-700 mb-2">Step 1</div>
        <h2 className="font-sans text-3xl font-bold text-slate-900 mb-2">Choose a dataset</h2>
        <p className="text-slate-600">Pick one of the built-in fairness benchmark datasets, or upload your own CSV.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {BUILTIN_DATASETS.map((d) => {
          const selected = ds.source === "builtin" && ds.name === d.name;
          return (
            <button
              key={d.id}
              type="button"
              data-testid={`builtin-dataset-${d.id}`}
              onClick={() => selectBuiltin(d.id)}
              className={`text-left p-5 rounded-lg border transition-all ${
                selected ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900" : "border-slate-200 bg-white hover:border-slate-400"
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-4 h-4 text-slate-700" strokeWidth={1.5} />
                <span className="font-sans font-semibold text-slate-900">{d.name}</span>
                {d.recommendation && <Badge variant="outline" className="ml-auto border-teal-300 bg-teal-50 text-teal-800 text-[10px]">{d.recommendation}</Badge>}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mb-3">{d.description}</p>
              {d.recommendation_reason && <p className="text-xs leading-relaxed text-slate-500 mb-3">{d.recommendation_reason}</p>}
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                <span>{d.rows.toLocaleString()} rows</span>
                <span>·</span>
                <span>{d.columns.length} cols</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-px bg-slate-200 flex-1" />
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">or upload</span>
          <div className="h-px bg-slate-200 flex-1" />
        </div>
        <label
          data-testid="upload-dropzone"
          className={`block border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
            uploading ? "border-slate-400 bg-slate-50 cursor-wait" :
            ds.source === "upload" ? "border-teal-500 bg-teal-50/40" : "border-slate-300 hover:border-slate-400 bg-slate-50/50"
          }`}
        >
          <input
            type="file"
            accept=".csv"
            className="hidden"
            data-testid="upload-file-input"
            disabled={uploading}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {uploading ? (
            <div className="flex items-center justify-center gap-3 text-slate-700">
              <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} />
              <span className="font-mono text-sm">Uploading &amp; parsing…</span>
            </div>
          ) : ds.source === "upload" && uploadedName ? (
            <div className="flex items-center justify-center gap-3 text-slate-900">
              <FileText className="w-5 h-5" strokeWidth={1.5} />
              <span className="font-mono text-sm">{uploadedName}</span>
              <span className="text-xs text-slate-500">(click to replace)</span>
            </div>
          ) : (
            <>
              <UploadCloud className="w-6 h-6 text-slate-500 mx-auto mb-2" strokeWidth={1.5} />
              <div className="font-medium text-slate-700 text-sm">Drop a .csv file here or click to browse</div>
              <div className="text-xs text-slate-500 mt-1">Parsed server-side with pandas · up to 50 MB. Large files can take longer to profile.</div>
            </>
          )}
        </label>
      </div>

      {ds.name && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="space-y-4">
            <div>
              <Label className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-2 block">Label column</Label>
              <Select value={ds.label_column} onValueChange={changeLabel}>
                <SelectTrigger data-testid="label-column-select" className="w-full">
                  <SelectValue placeholder="Select label column" />
                </SelectTrigger>
                <SelectContent>
                  {ds.columns.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {state.task_type === "classification" && ds.profile?.n_classes === 2 && (
              <div>
                <Label className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-2 block">Positive label value</Label>
                <Select value={ds.positive_label} onValueChange={(value) => updateDataset({ positive_label: value })}>
                  <SelectTrigger data-testid="positive-label-input" className="w-full">
                    <SelectValue placeholder="Choose the outcome that counts as positive" />
                  </SelectTrigger>
                  <SelectContent>
                    {ds.target_values.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-slate-500">This is a problem-definition choice, not inferred from row order. Select the outcome your analysis treats as positive.</p>
                {state.fairness_enabled && !ds.positive_label && <p className="mt-1 text-xs text-amber-800">Required for binary fairness gaps: choose the positive outcome explicitly.</p>}
              </div>
            )}
            <div>
              <Label className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-2 block">Sensitive / protected attributes</Label>
              <div className="flex flex-wrap gap-2" data-testid="sensitive-attrs-container">
                {ds.columns.filter((c) => c !== ds.label_column).map((c) => {
                  const active = ds.sensitive_attrs.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      data-testid={`sensitive-attr-${c}`}
                      onClick={() => toggleSensitive(c)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        active
                          ? "bg-teal-700 text-white border-teal-700"
                          : "bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      {c} {active && <X className="w-3 h-3 inline ml-1" strokeWidth={2} />}
                    </button>
                  );
                })}
              </div>
              {state.task_type === "classification" && state.fairness_enabled && ds.sensitive_attrs.length === 0 && (
                <p className="mt-2 text-xs text-amber-800">Choose at least one attribute that defines the groups to compare. Fairness metrics and group-aware mitigations cannot be computed without it.</p>
              )}
            </div>
          </div>

          <Card className="p-4 bg-slate-50 border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Preview</div>
              <Badge variant="outline" className="font-mono text-[10px] border-slate-300">{ds.name}</Badge>
            </div>
            <div className="overflow-x-auto code-scroll rounded border border-slate-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    {ds.columns.slice(0, 6).map((c) => (
                      <TableHead key={c} className="font-mono text-[10px] uppercase tracking-wider text-slate-500 whitespace-nowrap">{c}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(ds.preview || []).slice(0, 4).map((row, i) => (
                    <TableRow key={i}>
                      {ds.columns.slice(0, 6).map((c) => (
                        <TableCell key={c} className="font-mono text-xs text-slate-800 whitespace-nowrap">
                          {String(row[c] ?? "—")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {ds.profile && (
        <section className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-5" aria-label="Dataset analysis">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-slate-900">Dataset analysis</h3>
            <Badge variant="outline" className="uppercase">{ds.profile.task_type} target</Badge>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {ds.profile.n_rows?.toLocaleString()} rows · {ds.profile.n_features} features · {ds.profile.n_numeric_features} numeric · {ds.profile.n_categorical_features} categorical · {(ds.profile.missing_value_ratio * 100).toFixed(1)}% values missing
          </p>
          {ds.profile.class_counts?.length > 0 && (
            <p className="mt-1 text-sm text-slate-600">
              Target counts: {ds.profile.class_counts.map((item) => `${item.label}: ${item.count}`).join(" · ")}
              {ds.profile.class_imbalance_ratio && ` · largest/smallest class: ${ds.profile.class_imbalance_ratio}×`}
            </p>
          )}
          {ds.profile.sensitive_groups?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600">Protected-group support · selected attributes intersected</p>
              <ul className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2">
                {ds.profile.sensitive_groups.map((group) => (
                  <li key={group.group} className="text-xs text-slate-700">
                    {group.group}: {group.count} rows{group.class_counts?.length ? ` · ${group.class_counts.map((item) => `${item.label}: ${item.count}`).join(", ")}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {ds.profile.warnings?.length > 0 && (
            <ul className="mt-3 space-y-2" aria-label="Dataset warnings">
              {ds.profile.warnings.map((warning) => <li key={warning} className="flex gap-2 text-sm text-amber-900"><span aria-hidden="true">⚠</span><span>{warning}</span></li>)}
            </ul>
          )}
          {ds.profile.task_type === "classification" && ds.profile.n_classes !== 2 && (
            <p className="mt-3 text-sm text-amber-900">The current fairness metrics and mitigation algorithms support binary classification only; this target has {ds.profile.n_classes} classes.</p>
          )}
        </section>
      )}
    </div>
  );
}
