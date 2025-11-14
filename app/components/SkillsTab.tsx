import {
  Plus,
  X,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface SkillsTabProps {
  skills: any[];
  updateCharacter: (updates: any) => void;
  stats?: any;
}

// Predefined professional skills from the image
const PROFESSIONAL_SKILLS = [
  { name: "Acrobatics", formula: "STR+DEX" },
  { name: "Acting", formula: "CHA x2" },
  { name: "Art", formula: "POW+CHA" },
  { name: "Astrogate", formula: "INT x2" },
  { name: "Bureaucracy", formula: "INT x2" },
  { name: "Commerce", formula: "INT+CHA" },
  { name: "Comms", formula: "INT x2" },
  { name: "Courtesy", formula: "INT+CHA" },
  { name: "Craft", formula: "DEX+INT" },
  { name: "Culture", formula: "INT x2" },
  { name: "Demolitions", formula: "INT+POW" },
  { name: "Disguise", formula: "INT+CHA" },
  { name: "Electronics", formula: "DEX+INT" },
  {
    name: "Engineering",
    formula: "INT x2",
    note: "Large scale civil/military engineering",
  },
  { name: "Forgery", formula: "DEX+INT" },
  { name: "Gambling", formula: "INT+POW" },
  { name: "Healing", formula: "INT+POW" },
  { name: "Language", formula: "INT+CHA" },
  { name: "Lockpicking", formula: "DEX x2" },
  { name: "Mechanics", formula: "CON+INT", note: "Ship maintenance/drives" },
  { name: "Meditation", formula: "INT+POW" },
  { name: "Musicianship", formula: "DEX+CHA" },
  { name: "Navigation", formula: "INT+POW" },
  { name: "Oratory", formula: "POW+CHA" },
  { name: "Pilot", formula: "DEX+INT" },
  { name: "Politics", formula: "INT+CHA" },
  { name: "Science", formula: "INT x2" },
  { name: "Sensors", formula: "INT+POW" },
  { name: "Seduction", formula: "INT+CHA" },
  { name: "Sleight", formula: "DEX+CHA" },
  { name: "Streetwise", formula: "POW+CHA" },
  { name: "Survival", formula: "CON+POW" },
  { name: "Teach", formula: "INT+CHA" },
  { name: "The Force", formula: "POW x2" },
  { name: "Track", formula: "INT+CON" },
];

const SkillsTab = ({ skills, updateCharacter, stats }: SkillsTabProps) => {
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [selectedProfSkill, setSelectedProfSkill] = useState("");
  const addInputRef = useRef<HTMLInputElement | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const computeBaseValue = (formula?: string) => {
    if (!formula || !stats) return 0;
    const upper = formula.toUpperCase().trim();
    // Pattern: ABC + DEF
    const plusMatch = upper.match(/^([A-Z]{3})\s*\+\s*([A-Z]{3})$/);
    if (plusMatch) {
      const a = plusMatch[1];
      const b = plusMatch[2];
      const toKey = (k: string) => k.toLowerCase() as keyof typeof stats;
      const av = Number((stats as any)[toKey(a)] ?? 0);
      const bv = Number((stats as any)[toKey(b)] ?? 0);
      return av + bv;
    }
    // Pattern: ABC xN
    const multMatch = upper.match(/^([A-Z]{3})\s*x\s*(\d+)$/i);
    if (multMatch) {
      const a = multMatch[1];
      const n = parseInt(multMatch[2] || "1");
      const toKey = (k: string) => k.toLowerCase() as keyof typeof stats;
      const av = Number((stats as any)[toKey(a)] ?? 0);
      return av * (isNaN(n) ? 1 : n);
    }
    return 0;
  };

  const handleAddSkill = () => {
    const skillToAdd = selectedProfSkill || newSkillName;
    if (!skillToAdd) return;

    const profSkill = PROFESSIONAL_SKILLS.find(
      (s) => s.name === selectedProfSkill
    );

    const newSkill = {
      id: Date.now(),
      name: skillToAdd,
      formula: profSkill?.formula || "",
      value: profSkill?.formula ? computeBaseValue(profSkill.formula) : 0,
      fumbled: false,
      trained: false,
      note: profSkill?.note || "",
      isCustom: !profSkill,
    };

    updateCharacter({ skills: [...skills, newSkill] });
    setNewSkillName("");
    setSelectedProfSkill("");
    setShowAddSkill(false);
  };

  useEffect(() => {
    if (showAddSkill && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [showAddSkill]);

  const sortSkillsAZ = () => {
    const sorted = [...skills].sort((a: any, b: any) =>
      (a.name || "").localeCompare(b.name || "")
    );
    updateCharacter({ skills: sorted });
  };

  const handleUpdateSkill = (id: number, field: string, value: any) => {
    const updatedSkills = skills.map((skill: any) =>
      skill.id === id ? { ...skill, [field]: value } : skill
    );
    updateCharacter({ skills: updatedSkills });
  };

  const handleRemoveSkill = (id: number) => {
    const updatedSkills = skills.filter((skill: any) => skill.id !== id);
    updateCharacter({ skills: updatedSkills });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-cyan-300 glow-cyan">
          Professional Skills
        </h3>
      </div>

      {stats && (
        <div className="bg-gray-800/30 border border-cyan-500/20 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-2">Attributes</div>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-0.5 rounded bg-gray-900/40 border border-cyan-500/20 text-cyan-200 text-xs">
              STR {stats.str}
            </span>
            <span className="px-2 py-0.5 rounded bg-gray-900/40 border border-cyan-500/20 text-cyan-200 text-xs">
              CON {stats.con}
            </span>
            <span className="px-2 py-0.5 rounded bg-gray-900/40 border border-cyan-500/20 text-cyan-200 text-xs">
              SIZ {stats.siz}
            </span>
            <span className="px-2 py-0.5 rounded bg-gray-900/40 border border-cyan-500/20 text-cyan-200 text-xs">
              DEX {stats.dex}
            </span>
            <span className="px-2 py-0.5 rounded bg-gray-900/40 border border-cyan-500/20 text-cyan-200 text-xs">
              INT {stats.int}
            </span>
            <span className="px-2 py-0.5 rounded bg-gray-900/40 border border-cyan-500/20 text-cyan-200 text-xs">
              POW {stats.pow}
            </span>
            <span className="px-2 py-0.5 rounded bg-gray-900/40 border border-cyan-500/20 text-cyan-200 text-xs">
              CHA {stats.cha}
            </span>
          </div>
        </div>
      )}

      {/* Inline Add Skill - rendered at bottom when active */}

      {/* Skills List */}
      {skills.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No skills added yet. Click "Add Skill" to get started.
        </div>
      ) : (
        <>
          {/* Mobile stacked layout (no horizontal scroll) */}
          <div className="sm:hidden space-y-2">
            {skills.map((skill: any) => {
              const isExpanded = !!expanded[skill.id];
              return (
                <div
                  key={skill.id}
                  className="bg-gray-800/30 border border-cyan-500/20 rounded-lg p-3"
                >
                  <div className="flex flex-wrap items-center gap-2 w-full">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 text-sm font-medium text-gray-200 truncate">
                        <span>{skill.name || "Unnamed"}</span>
                        {skill.note && skill.note.trim() !== "" && (
                          <span title="Has note">
                            <FileText className="w-3 h-3 text-cyan-400" />
                          </span>
                        )}
                      </div>
                    </div>
                    <input
                      type="text"
                      value={
                        skill.value === 0 || skill.value === ""
                          ? ""
                          : skill.value
                      }
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        if (inputValue === "") {
                          handleUpdateSkill(skill.id, "value", "");
                        } else if (/^\d+$/.test(inputValue)) {
                          handleUpdateSkill(
                            skill.id,
                            "value",
                            parseInt(inputValue)
                          );
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value === "" || skill.value === "") {
                          handleUpdateSkill(skill.id, "value", 0);
                        }
                      }}
                      className="w-14 sm:w-16 px-2 py-1 bg-gray-800/50 border border-cyan-500/30 rounded text-gray-100 text-center focus:outline-none focus:border-cyan-500/50"
                      placeholder="0"
                    />
                    <button
                      onClick={() =>
                        setExpanded((prev) => ({
                          ...prev,
                          [skill.id]: !prev[skill.id],
                        }))
                      }
                      className="p-2 bg-gray-800/40 border border-cyan-500/20 rounded hover:bg-gray-800/60"
                      aria-expanded={isExpanded}
                      title={isExpanded ? "Collapse" : "Expand"}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="mt-2 space-y-2">
                      <div>
                        <label className="text-xs text-gray-400">Name</label>
                        <input
                          type="text"
                          value={skill.name}
                          onChange={(e) =>
                            handleUpdateSkill(skill.id, "name", e.target.value)
                          }
                          className="w-full px-2 py-1 bg-gray-800/50 border border-cyan-500/30 rounded text-gray-100 focus:outline-none focus:border-cyan-500/50"
                          placeholder="Skill name"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Formula</label>
                        <input
                          type="text"
                          value={skill.formula}
                          onChange={(e) =>
                            handleUpdateSkill(
                              skill.id,
                              "formula",
                              e.target.value
                            )
                          }
                          className="w-full px-2 py-1 bg-gray-800/50 border border-cyan-500/30 rounded text-gray-100 focus:outline-none focus:border-cyan-500/50"
                          placeholder="INT+DEX"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Status</label>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <button
                            onClick={() =>
                              handleUpdateSkill(
                                skill.id,
                                "fumbled",
                                !skill.fumbled
                              )
                            }
                            className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-2 ${
                              skill.fumbled
                                ? "bg-amber-600/20 border border-amber-500/50 text-amber-300"
                                : "bg-gray-800/30 border border-gray-600/30 text-gray-500"
                            }`}
                            title="Fumbled this session"
                          >
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm">Fumbled</span>
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateSkill(
                                skill.id,
                                "trained",
                                !skill.trained
                              )
                            }
                            className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-2 ${
                              skill.trained
                                ? "bg-green-600/20 border border-green-500/50 text-green-300"
                                : "bg-gray-800/30 border border-gray-600/30 text-gray-500"
                            }`}
                            title="Trained in this skill"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm">Trained</span>
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Notes</label>
                        <textarea
                          rows={1}
                          value={skill.note || ""}
                          onChange={(e) =>
                            handleUpdateSkill(skill.id, "note", e.target.value)
                          }
                          onInput={(e) => {
                            const el = e.currentTarget;
                            const minHeight = 30;
                            el.style.height = "auto";
                            const newHeight = Math.max(
                              el.scrollHeight,
                              minHeight
                            );
                            el.style.height = `${newHeight}px`;
                          }}
                          ref={(el) => {
                            if (el) {
                              const minHeight = 30;
                              el.style.height = "auto";
                              const newHeight = Math.max(
                                el.scrollHeight,
                                minHeight
                              );
                              el.style.height = `${newHeight}px`;
                            }
                          }}
                          className="w-full px-2 py-1 min-h-[30px] bg-gray-800/50 border border-cyan-500/30 rounded text-gray-100 focus:outline-none focus:border-cyan-500/50 resize-none overflow-hidden"
                          placeholder="Optional notes..."
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleRemoveSkill(skill.id)}
                          className="p-2 bg-red-600/20 border border-red-500/50 rounded-lg hover:bg-red-600/30 transition-colors"
                          title="Remove skill"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop table layout */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="text-left text-sm text-cyan-300 border-b border-cyan-500/20">
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Formula</th>
                  <th className="pb-2">Value %</th>
                  <th className="pb-2">Notes</th>
                  <th className="pb-2">Trained</th>
                  <th className="pb-2">Fumbled</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {skills.map((skill: any) => (
                  <tr
                    key={skill.id}
                    className="border-b border-gray-800 align-top"
                  >
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={skill.name}
                          onChange={(e) =>
                            handleUpdateSkill(skill.id, "name", e.target.value)
                          }
                          className="flex-1 px-2 py-1 bg-gray-800/50 border border-cyan-500/30 rounded text-gray-100 focus:outline-none focus:border-cyan-500/50"
                          placeholder="Skill name"
                        />
                      </div>
                    </td>
                    <td className="py-2 w-28 sm:w-32">
                      <input
                        type="text"
                        value={skill.formula}
                        onChange={(e) =>
                          handleUpdateSkill(skill.id, "formula", e.target.value)
                        }
                        className="w-full px-2 py-1 bg-gray-800/50 border border-cyan-500/30 rounded text-gray-100 focus:outline-none focus:border-cyan-500/50"
                        placeholder="e.g., INT+DEX"
                      />
                    </td>
                    <td className="py-2 w-28">
                      <input
                        type="text"
                        value={
                          skill.value === 0 || skill.value === ""
                            ? ""
                            : skill.value
                        }
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          if (inputValue === "") {
                            handleUpdateSkill(skill.id, "value", "");
                          } else if (/^\d+$/.test(inputValue)) {
                            handleUpdateSkill(
                              skill.id,
                              "value",
                              parseInt(inputValue)
                            );
                          }
                        }}
                        onBlur={(e) => {
                          if (e.target.value === "" || skill.value === "") {
                            handleUpdateSkill(skill.id, "value", 0);
                          }
                        }}
                        className="w-full px-2 py-1 bg-gray-800/50 border border-cyan-500/30 rounded text-gray-100 focus:outline-none focus:border-cyan-500/50"
                        placeholder="0"
                      />
                    </td>
                    <td className="py-2">
                      <textarea
                        rows={1}
                        value={skill.note || ""}
                        onChange={(e) =>
                          handleUpdateSkill(skill.id, "note", e.target.value)
                        }
                        onInput={(e) => {
                          const el = e.currentTarget;
                          const minHeight = 30; // match input height
                          el.style.height = "auto";
                          const newHeight = Math.max(
                            el.scrollHeight,
                            minHeight
                          );
                          el.style.height = `${newHeight}px`;
                        }}
                        ref={(el) => {
                          if (el) {
                            const minHeight = 30;
                            el.style.height = "auto";
                            const newHeight = Math.max(
                              el.scrollHeight,
                              minHeight
                            );
                            el.style.height = `${newHeight}px`;
                          }
                        }}
                        className="w-full px-2 py-1 min-h-[30px] bg-gray-800/50 border border-cyan-500/30 rounded text-gray-100 focus:outline-none focus:border-cyan-500/50 resize-none overflow-hidden"
                        placeholder="Optional notes..."
                      />
                    </td>
                    <td className="py-2 w-20 align-middle">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() =>
                            handleUpdateSkill(
                              skill.id,
                              "trained",
                              !skill.trained
                            )
                          }
                          className={`px-3 py-1 rounded-lg transition-colors ${
                            skill.trained
                              ? "bg-green-600/20 border border-green-500/50 text-green-300"
                              : "bg-gray-800/30 border border-gray-600/30 text-gray-500"
                          }`}
                          title="Trained in this skill"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="py-2 w-20 align-middle">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() =>
                            handleUpdateSkill(
                              skill.id,
                              "fumbled",
                              !skill.fumbled
                            )
                          }
                          className={`px-3 py-1 rounded-lg transition-colors ${
                            skill.fumbled
                              ? "bg-amber-600/20 border border-amber-500/50 text-amber-300"
                              : "bg-gray-800/30 border border-gray-600/30 text-gray-500"
                          }`}
                          title="Fumbled this session"
                        >
                          <AlertCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="py-2 w-12">
                      <button
                        onClick={() => handleRemoveSkill(skill.id)}
                        className="p-2 bg-red-600/20 border border-red-500/50 rounded-lg hover:bg-red-600/30 transition-colors"
                        title="Remove skill"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between">
          <button
            onClick={sortSkillsAZ}
            className="px-3 py-2 bg-gray-800/30 border border-cyan-500/30 rounded-lg hover:bg-gray-800/50 transition-colors text-gray-200"
          >
            Sort A–Z
          </button>
          {!showAddSkill && (
            <button
              onClick={() => setShowAddSkill(true)}
              className="px-4 py-2 bg-cyan-600/20 border border-cyan-500/50 rounded-lg hover:bg-cyan-600/30 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Skill
            </button>
          )}
        </div>

        {showAddSkill && (
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-cyan-300 mb-1">
                Skill Name
              </label>
              <input
                ref={addInputRef}
                type="text"
                list="skills-list"
                value={newSkillName}
                onChange={(e) => {
                  const value = e.target.value;
                  setNewSkillName(value);
                  const match = PROFESSIONAL_SKILLS.find(
                    (s) => s.name.toLowerCase() === value.toLowerCase()
                  );
                  setSelectedProfSkill(match ? match.name : "");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSkill();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setShowAddSkill(false);
                    setNewSkillName("");
                    setSelectedProfSkill("");
                  }
                }}
                className="w-full px-3 py-2 bg-gray-800/50 border border-cyan-500/30 rounded-lg text-gray-100 focus:outline-none focus:border-cyan-500/50"
                placeholder="Type to search..."
              />
              <datalist id="skills-list">
                {PROFESSIONAL_SKILLS.map((skill) => (
                  <option key={skill.name} value={skill.name} />
                ))}
              </datalist>
              {(() => {
                const match = PROFESSIONAL_SKILLS.find(
                  (s) => s.name.toLowerCase() === newSkillName.toLowerCase()
                );
                if (!match) return null;
                const base = computeBaseValue(match.formula);
                return (
                  <div className="text-xs text-gray-400 mt-2 flex gap-4">
                    <span>Formula: {match.formula}</span>
                    {stats && <span>Base: {base}%</span>}
                  </div>
                );
              })()}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddSkill}
                disabled={!selectedProfSkill && !newSkillName}
                className="px-4 py-2 bg-green-600/20 border border-green-500/50 rounded-lg hover:bg-green-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddSkill(false);
                  setNewSkillName("");
                  setSelectedProfSkill("");
                }}
                className="px-4 py-2 bg-red-600/20 border border-red-500/50 rounded-lg hover:bg-red-600/30 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillsTab;
