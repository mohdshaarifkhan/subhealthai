import React from "react";
import { View, Text } from "@react-pdf/renderer";
import type { ConditionRisk } from "@/lib/risk/types";

type Props = {
  overall_index: number;
  overall_tier: "low" | "moderate" | "high";
  conditions: ConditionRisk[];
  disclaimer: string;
};

const tierLabel = (tier: Props["overall_tier"]) => {
  if (tier === "low") return "Low pattern match";
  if (tier === "moderate") return "Moderate pattern match";
  return "Higher pattern match";
};

const asPercent = (x: number) => `${Math.round(x * 100)}%`;

function labelForCondition(c: ConditionRisk["condition"]): string {
  switch (c) {
    case "prediabetes":
      return "Prediabetes Risk Pattern";
    case "kidney_function":
      return "Kidney Function Pattern";
    case "metabolic_strain":
      return "Metabolic Strain Pattern";
    case "thyroid":
      return "Thyroid Pattern";
    case "cardio_pattern":
      return "Cardio-Metabolic Pattern";
    case "inflammatory_load":
      return "Inflammatory Load";
    case "allergy_burden":
      return "Allergy Burden";
    case "autonomic_recovery":
      return "Autonomic Recovery Pattern";
  }
}

export const MultimodalSection: React.FC<Props> = ({
  overall_index,
  overall_tier,
  conditions,
  disclaimer,
}) => {
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
        Multimodal Condition Patterns (Non-Diagnostic)
      </Text>

      <View style={{ marginBottom: 6 }}>
        <Text style={{ fontSize: 10 }}>
          Overall Multimodal Index: {asPercent(overall_index)} ({tierLabel(overall_tier)})
        </Text>
        <Text style={{ fontSize: 8, color: "#555", marginTop: 2 }}>
          This is a SubHealthAI internal research index (0–1 scale) combining wearable, lab, lifestyle, allergy, and context data. It
          describes pattern overlap with subclinical risk profiles and does not represent a probability of disease.
        </Text>
      </View>

      {conditions.length > 0 ? (
        <View>
          {conditions.map((c) => (
            <View
              key={c.condition}
              style={{
                marginTop: 4,
                paddingVertical: 2,
                borderTopWidth: 0.5,
                borderColor: "#ddd",
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: 600 }}>
                {labelForCondition(c.condition)} — {asPercent(c.index)} ({tierLabel(c.tier)})
              </Text>
              {c.reasons && c.reasons.length > 0 && (
                <View style={{ marginTop: 1 }}>
                  {c.reasons.slice(0, 3).map((r, idx) => (
                    <Text key={idx} style={{ fontSize: 8 }}>
                      • {r}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      ) : (
        <Text style={{ fontSize: 8, marginTop: 2 }}>
          Not enough multimodal information was provided to compute condition-level patterns. Adding labs, vitals, lifestyle, or allergy data
          can make this section richer.
        </Text>
      )}

      <View
        style={{
          marginTop: 6,
          padding: 4,
          borderWidth: 0.5,
          borderColor: "#ccc",
          borderRadius: 2,
        }}
      >
        <Text style={{ fontSize: 8, fontWeight: 600 }}>Important:</Text>
        <Text style={{ fontSize: 8 }}>{disclaimer}</Text>
        <Text style={{ fontSize: 8, marginTop: 2 }}>
          These indices are designed to highlight patterns that may warrant preventive attention and discussion with a clinician. They do not
          replace diagnostic testing or medical judgment.
        </Text>
      </View>
    </View>
  );
};


