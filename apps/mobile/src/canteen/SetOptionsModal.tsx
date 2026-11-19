import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type {
  MenuOptionGroup,
  SelectedOptions,
} from "@fusion-express/shared/canteen-set-options";
import {
  optionSelectionsComplete,
  priceDeltaForSelections,
} from "@fusion-express/shared/canteen-set-options";
import { colors } from "../theme";

type Props = {
  visible: boolean;
  title: string;
  basePrice: number;
  groups: MenuOptionGroup[];
  onClose: () => void;
  onConfirm: (selected: SelectedOptions) => void;
};

export function SetOptionsModal({
  visible,
  title,
  basePrice,
  groups,
  onClose,
  onConfirm,
}: Props) {
  const [selected, setSelected] = useState<SelectedOptions>({});
  const [step, setStep] = useState(0);
  const group = groups[step];
  const complete = optionSelectionsComplete(groups, selected);
  const total = basePrice + priceDeltaForSelections(groups, selected);
  const stepLabel = useMemo(
    () => `Step ${step + 1} of ${groups.length}`,
    [step, groups.length],
  );

  if (!group) return null;

  function toggleChoice(groupId: string, choiceId: string, max: number) {
    setSelected((prev) => {
      const cur = prev[groupId] ?? [];
      if (max <= 1) return { ...prev, [groupId]: [choiceId] };
      if (cur.includes(choiceId)) {
        return { ...prev, [groupId]: cur.filter((id) => id !== choiceId) };
      }
      if (cur.length >= max) return prev;
      return { ...prev, [groupId]: [...cur, choiceId] };
    });
  }

  function next() {
    const picks = selected[group.id] ?? [];
    const min = group.min ?? (group.required === false ? 0 : 1);
    if (picks.length < min) return;
    if (step < groups.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    if (complete) {
      onConfirm(selected);
      setSelected({});
      setStep(0);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.step}>{stepLabel}</Text>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{group.label}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.list}>
            {group.choices.map((choice) => {
              const picks = selected[group.id] ?? [];
              const active = picks.includes(choice.id);
              const delta = choice.priceDelta ?? 0;
              return (
                <Pressable
                  key={choice.id}
                  style={[styles.choice, active && styles.choiceActive]}
                  onPress={() =>
                    toggleChoice(group.id, choice.id, group.max ?? 1)
                  }
                >
                  <Text style={styles.choiceLabel}>{choice.label}</Text>
                  <Text style={styles.choiceDelta}>
                    {delta === 0 ? "Free" : `+HK$${delta}`}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.footer}>
            <Text style={styles.total}>HK${total}</Text>
            <View style={styles.actions}>
              {step > 0 ? (
                <Pressable
                  style={styles.secondary}
                  onPress={() => setStep((s) => s - 1)}
                >
                  <Text style={styles.secondaryText}>Back</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={[
                  styles.primary,
                  (selected[group.id] ?? []).length <
                    (group.min ?? (group.required === false ? 0 : 1)) &&
                    styles.primaryDisabled,
                ]}
                onPress={next}
              >
                <Text style={styles.primaryText}>
                  {step < groups.length - 1 ? "Next" : "Add to cart"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "85%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  header: { flexDirection: "row", gap: 12, marginBottom: 12 },
  step: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
  },
  title: { marginTop: 4, fontSize: 18, fontWeight: "800", color: "#111" },
  subtitle: { marginTop: 4, fontSize: 13, color: "#4B5563" },
  close: { color: "#6B7280", fontWeight: "600" },
  list: { paddingBottom: 12, gap: 8 },
  choice: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: "#fff",
  },
  choiceActive: { borderColor: colors.fusion, backgroundColor: "#FEF2F2" },
  choiceLabel: { fontSize: 14, fontWeight: "600", color: "#111" },
  choiceDelta: { fontSize: 13, color: "#4B5563" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  total: { fontSize: 16, fontWeight: "800", color: colors.fusion },
  actions: { flexDirection: "row", gap: 8 },
  secondary: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryText: { fontWeight: "700", color: "#374151" },
  primary: {
    borderRadius: 12,
    backgroundColor: colors.fusion,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryDisabled: { backgroundColor: "#9CA3AF" },
  primaryText: { fontWeight: "800", color: "#fff" },
});
