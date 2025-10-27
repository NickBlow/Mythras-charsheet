import {
  X,
  Clock,
  ChevronLeft,
  ChevronRight,
  Calendar,
  RotateCcw,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useFetcher, useLocation, useRevalidator } from "react-router";

interface VersionHistoryModalProps {
  onClose: () => void;
  currentCharacter: any;
}

const VersionHistoryModal = ({
  onClose,
  currentCharacter,
}: VersionHistoryModalProps) => {
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<any>(null);
  const [comparing, setComparing] = useState(false);
  const fetcher = useFetcher();
  const restoreFetcher = useFetcher();
  const location = useLocation();
  const revalidator = useRevalidator();

  useEffect(() => {
    // Load version history
    const formData = new FormData();
    formData.append("action", "getHistory");

    fetcher.submit(formData, {
      method: "post",
      action: location.pathname,
    });
  }, []);

  useEffect(() => {
    if (fetcher.data?.history) {
      setVersions(fetcher.data.history);
    }
    if (fetcher.data?.version) {
      setSelectedVersion(fetcher.data.version);
      setComparing(true);
    }
  }, [fetcher.data]);

  const reloadHistory = () => {
    const formData = new FormData();
    formData.append("action", "getHistory");
    fetcher.submit(formData, { method: "post", action: location.pathname });
  };

  const restoreSelectedVersion = () => {
    if (!selectedVersion) return;
    const { version, created_at, lastSaved, currentVersion, ...rest } =
      selectedVersion || {};
    const payload = rest;

    const formData = new FormData();
    formData.append("action", "restore");
    formData.append("data", JSON.stringify(payload));
    restoreFetcher.submit(formData, {
      method: "post",
      action: location.pathname,
    });
  };

  useEffect(() => {
    if (restoreFetcher.state === "idle" && restoreFetcher.data?.success) {
      // Revalidate route loader to pull latest data, then refresh history list
      revalidator.revalidate();
      reloadHistory();
    }
  }, [restoreFetcher.state, restoreFetcher.data, revalidator]);

  const loadVersion = (versionId: number) => {
    const formData = new FormData();
    formData.append("action", "getVersion");
    formData.append("versionId", versionId.toString());

    fetcher.submit(formData, {
      method: "post",
      action: location.pathname,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) {
      return "Just now";
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  const getDifferences = () => {
    if (!selectedVersion || !currentCharacter) return [];

    const diffs: string[] = [];

    // Check basic info differences
    if (selectedVersion.info?.name !== currentCharacter.info?.name) {
      diffs.push(
        `Name changed from "${selectedVersion.info?.name}" to "${currentCharacter.info?.name}"`
      );
    }
    if (
      selectedVersion.info?.experienceRolls !==
      currentCharacter.info?.experienceRolls
    ) {
      diffs.push(
        `Experience rolls: ${selectedVersion.info?.experienceRolls} → ${currentCharacter.info?.experienceRolls}`
      );
    }

    // Check stats differences
    const statKeys = ["str", "con", "siz", "dex", "int", "pow", "cha"];
    statKeys.forEach((key) => {
      if (selectedVersion.stats?.[key] !== currentCharacter.stats?.[key]) {
        diffs.push(
          `${key.toUpperCase()}: ${selectedVersion.stats?.[key]} → ${currentCharacter.stats?.[key]}`
        );
      }
    });

    // Check hit points
    Object.keys(selectedVersion.hitPoints || {}).forEach((location) => {
      const oldHP = selectedVersion.hitPoints[location];
      const newHP = currentCharacter.hitPoints?.[location];
      if (oldHP?.current !== newHP?.current || oldHP?.max !== newHP?.max) {
        diffs.push(
          `${location} HP: ${oldHP?.current}/${oldHP?.max} → ${newHP?.current}/${newHP?.max}`
        );
      }
    });

    // Check skills count
    const oldSkillCount = selectedVersion.skills?.length || 0;
    const newSkillCount = currentCharacter.skills?.length || 0;
    if (oldSkillCount !== newSkillCount) {
      diffs.push(`Skills: ${oldSkillCount} → ${newSkillCount} skills`);
    }

    // Detailed skills differences
    const oldSkills: any[] = Array.isArray(selectedVersion.skills)
      ? selectedVersion.skills
      : [];
    const newSkills: any[] = Array.isArray(currentCharacter.skills)
      ? currentCharacter.skills
      : [];

    const oldById = new Map<number, any>(
      oldSkills
        .filter((s) => s && typeof s.id === "number")
        .map((s) => [s.id, s])
    );
    const newById = new Map<number, any>(
      newSkills
        .filter((s) => s && typeof s.id === "number")
        .map((s) => [s.id, s])
    );

    // Removed skills
    oldById.forEach((oldSkill, id) => {
      if (!newById.has(id)) {
        diffs.push(`Skill removed: ${oldSkill.name || "Unnamed"}`);
      }
    });

    // Added skills
    newById.forEach((newSkill, id) => {
      if (!oldById.has(id)) {
        diffs.push(`Skill added: ${newSkill.name || "Unnamed"}`);
      }
    });

    // Modified skills
    oldById.forEach((oldSkill, id) => {
      const newSkill = newById.get(id);
      if (!newSkill) return;
      const name = newSkill.name || oldSkill.name || "Unnamed";

      if (oldSkill.name !== newSkill.name) {
        diffs.push(
          `Skill: Name changed "${oldSkill.name || "Unnamed"}" → "${
            newSkill.name || "Unnamed"
          }"`
        );
      }
      if ((oldSkill.formula || "") !== (newSkill.formula || "")) {
        diffs.push(
          `Skill ${name}: formula ${oldSkill.formula || "—"} → ${newSkill.formula || "—"}`
        );
      }
      const oldVal = typeof oldSkill.value === "number" ? oldSkill.value : 0;
      const newVal = typeof newSkill.value === "number" ? newSkill.value : 0;
      if (oldVal !== newVal) {
        diffs.push(`Skill ${name}: value ${oldVal} → ${newVal}`);
      }
      const oldNote = (oldSkill.note || "").trim();
      const newNote = (newSkill.note || "").trim();
      if (oldNote !== newNote) {
        if (!oldNote && newNote) diffs.push(`Skill ${name}: note added`);
        else if (oldNote && !newNote) diffs.push(`Skill ${name}: note removed`);
        else diffs.push(`Skill ${name}: note changed`);
      }
      const oldF = !!oldSkill.fumbled;
      const newF = !!newSkill.fumbled;
      if (oldF !== newF) {
        diffs.push(
          `Skill ${name}: fumbled ${oldF ? "true" : "false"} → ${newF ? "true" : "false"}`
        );
      }
    });

    // Equipment differences (weapons, armor, misc)
    const oldEq = selectedVersion.equipment || {};
    const newEq = currentCharacter.equipment || {};

    // Helper to compare lists by id
    const compareList = (
      label: string,
      oldList: any[] = [],
      newList: any[] = [],
      fieldLabels: Record<string, string>
    ) => {
      const oldMap = new Map<number, any>(
        (oldList || [])
          .filter((i) => i && typeof i.id === "number")
          .map((i) => [i.id, i])
      );
      const newMap = new Map<number, any>(
        (newList || [])
          .filter((i) => i && typeof i.id === "number")
          .map((i) => [i.id, i])
      );

      // removed
      oldMap.forEach((oldItem, id) => {
        if (!newMap.has(id)) {
          diffs.push(`${label} removed: ${oldItem.name || "Unnamed"}`);
        }
      });

      // added
      newMap.forEach((newItem, id) => {
        if (!oldMap.has(id)) {
          diffs.push(`${label} added: ${newItem.name || "Unnamed"}`);
        }
      });

      // modified
      oldMap.forEach((oldItem, id) => {
        const newItem = newMap.get(id);
        if (!newItem) return;
        const name = newItem.name || oldItem.name || "Unnamed";
        Object.keys(fieldLabels).forEach((field) => {
          const pretty = fieldLabels[field];
          let oldVal = (oldItem as any)[field];
          let newVal = (newItem as any)[field];
          // Normalize arrays like armor.locations
          if (Array.isArray(oldVal)) oldVal = JSON.stringify(oldVal);
          if (Array.isArray(newVal)) newVal = JSON.stringify(newVal);
          // Normalize undefined
          if (oldVal === undefined) oldVal = "";
          if (newVal === undefined) newVal = "";
          if (oldVal !== newVal) {
            diffs.push(
              `${label} ${name}: ${pretty} ${oldVal === "" ? "—" : oldVal} → ${newVal === "" ? "—" : newVal}`
            );
          }
        });
      });
    };

    // Weapons
    compareList("Weapon", oldEq.weapons || [], newEq.weapons || [], {
      name: "name",
      damage: "damage",
      range: "range",
      firingRate: "fire rate",
      ammo: "ammo",
      load: "load",
      traits: "traits",
      enc: "ENC",
      addDamageModifier: "add +DM",
    });

    // Armor
    compareList("Armor", oldEq.armor || [], newEq.armor || [], {
      name: "name",
      armorPoints: "AP",
      locations: "locations",
      enc: "ENC",
      cost: "cost",
      notes: "notes",
    });

    // Misc
    compareList("Item", oldEq.misc || [], newEq.misc || [], {
      name: "name",
      quantity: "quantity",
      enc: "ENC",
      notes: "notes",
    });

    return diffs;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-cyan-500/30 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-cyan-500/20">
          <h2 className="text-2xl font-bold text-cyan-300 glow-cyan flex items-center gap-2">
            <Clock className="w-6 h-6" />
            Version History
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-100px)]">
          {/* Version List */}
          <div className="w-1/3 border-r border-cyan-500/20 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-medium text-cyan-300 mb-3">
                Recent Versions (Last 14 Days)
              </h3>
              <div className="space-y-2">
                {versions.length === 0 ? (
                  <p className="text-gray-400 text-sm">
                    No version history available
                  </p>
                ) : (
                  versions.map((version) => (
                    <button
                      key={version.version}
                      onClick={() => loadVersion(version.version)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedVersion?.version === version.version
                          ? "bg-cyan-600/20 border-cyan-500/50"
                          : "bg-gray-800/30 border-gray-700/50 hover:bg-gray-800/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-300">
                            v{version.version}
                          </span>
                          {currentCharacter?.currentVersion ===
                            version.version && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-green-600/20 border border-green-500/40 text-green-300">
                              Current
                            </span>
                          )}
                        </div>
                        <Calendar className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDate(version.created_at)}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Version Comparison */}
          <div className="flex-1 overflow-y-auto">
            {!comparing ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Clock className="w-12 h-12 mb-3" />
                <p>Select a version to compare changes</p>
              </div>
            ) : (
              <div className="p-6">
                <div className="mb-6 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-cyan-300 mb-3">
                      Comparing Version {selectedVersion?.version} with Current
                    </h3>
                    <div className="text-sm text-gray-400">
                      {formatDate(selectedVersion?.created_at)} → Current
                    </div>
                  </div>
                  <button
                    onClick={restoreSelectedVersion}
                    disabled={
                      !selectedVersion || restoreFetcher.state !== "idle"
                    }
                    className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 whitespace-nowrap ${
                      restoreFetcher.state !== "idle"
                        ? "bg-yellow-700/20 border-yellow-600/40 text-yellow-400/60 cursor-not-allowed"
                        : "bg-yellow-600/20 border-yellow-500/50 text-yellow-300 hover:bg-yellow-600/30"
                    }`}
                    title="Restore this snapshot as a new version"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restore snapshot
                  </button>
                </div>

                {/* Character Summary Comparison */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="bg-gray-800/30 border border-red-500/20 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-red-400 mb-3">
                      Version {selectedVersion?.version}
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-500">Name:</span>{" "}
                        <span className="text-gray-300">
                          {selectedVersion?.info?.name || "Unnamed"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Culture:</span>{" "}
                        <span className="text-gray-300">
                          {selectedVersion?.info?.culture || "None"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Careers:</span>{" "}
                        <span className="text-gray-300">
                          {selectedVersion?.info?.careers?.join(", ") || "None"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">XP Rolls:</span>{" "}
                        <span className="text-gray-300">
                          {selectedVersion?.info?.experienceRolls || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-800/30 border border-green-500/20 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-green-400 mb-3">
                      Current
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-500">Name:</span>{" "}
                        <span className="text-gray-300">
                          {currentCharacter?.info?.name || "Unnamed"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Culture:</span>{" "}
                        <span className="text-gray-300">
                          {currentCharacter?.info?.culture || "None"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Careers:</span>{" "}
                        <span className="text-gray-300">
                          {currentCharacter?.info?.careers?.join(", ") ||
                            "None"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">XP Rolls:</span>{" "}
                        <span className="text-gray-300">
                          {currentCharacter?.info?.experienceRolls || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Changes List */}
                <div>
                  <h4 className="text-sm font-medium text-cyan-300 mb-3">
                    Changes Detected
                  </h4>
                  <div className="bg-gray-800/30 border border-cyan-500/20 rounded-lg p-4">
                    {getDifferences().length === 0 ? (
                      <p className="text-gray-400 text-sm">
                        No changes detected
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {getDifferences().map((diff, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-2 text-sm"
                          >
                            <ChevronRight className="w-4 h-4 text-cyan-400 mt-0.5" />
                            <span className="text-gray-300">{diff}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VersionHistoryModal;
