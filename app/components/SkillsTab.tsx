import { Plus, X, AlertCircle } from "lucide-react";
import { useState } from "react";

interface SkillsTabProps {
  skills: any[];
  updateCharacter: (updates: any) => void;
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
  { name: "Engineering", formula: "INT x2", note: "Large scale civil/military engineering" },
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

const SkillsTab = ({ skills, updateCharacter }: SkillsTabProps) => {
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [selectedProfSkill, setSelectedProfSkill] = useState("");

  const handleAddSkill = () => {
    const skillToAdd = selectedProfSkill || newSkillName;
    if (!skillToAdd) return;

    const profSkill = PROFESSIONAL_SKILLS.find(s => s.name === selectedProfSkill);
    
    const newSkill = {
      id: Date.now(),
      name: skillToAdd,
      formula: profSkill?.formula || "",
      value: 0,
      fumbled: false,
      note: profSkill?.note || "",
      isCustom: !profSkill,
    };

    updateCharacter({ skills: [...skills, newSkill] });
    setNewSkillName("");
    setSelectedProfSkill("");
    setShowAddSkill(false);
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
        <h3 className="text-xl font-bold text-cyan-300 glow-cyan">Professional Skills</h3>
        <button
          onClick={() => setShowAddSkill(true)}
          className="px-4 py-2 bg-cyan-600/20 border border-cyan-500/50 rounded-lg hover:bg-cyan-600/30 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Skill
        </button>
      </div>

      {/* Add Skill Modal */}
      {showAddSkill && (
        <div className="bg-gray-800/50 border border-cyan-500/30 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-cyan-300 mb-2">
              Select from Professional Skills
            </label>
            <select
              value={selectedProfSkill}
              onChange={(e) => {
                setSelectedProfSkill(e.target.value);
                setNewSkillName("");
              }}
              className="w-full px-3 py-2 bg-gray-800/50 border border-cyan-500/30 rounded-lg text-gray-100 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="">-- Select a skill --</option>
              {PROFESSIONAL_SKILLS.map((skill) => (
                <option key={skill.name} value={skill.name}>
                  {skill.name} ({skill.formula})
                </option>
              ))}
            </select>
          </div>

          <div className="text-center text-gray-400">OR</div>

          <div>
            <label className="block text-sm font-medium text-cyan-300 mb-2">
              Custom Skill Name
            </label>
            <input
              type="text"
              value={newSkillName}
              onChange={(e) => {
                setNewSkillName(e.target.value);
                setSelectedProfSkill("");
              }}
              className="w-full px-3 py-2 bg-gray-800/50 border border-cyan-500/30 rounded-lg text-gray-100 focus:outline-none focus:border-cyan-500/50"
              placeholder="Enter custom skill name..."
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddSkill}
              disabled={!selectedProfSkill && !newSkillName}
              className="flex-1 px-4 py-2 bg-green-600/20 border border-green-500/50 rounded-lg hover:bg-green-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowAddSkill(false);
                setNewSkillName("");
                setSelectedProfSkill("");
              }}
              className="flex-1 px-4 py-2 bg-red-600/20 border border-red-500/50 rounded-lg hover:bg-red-600/30 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Skills List */}
      <div className="space-y-3">
        {skills.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No skills added yet. Click "Add Skill" to get started.
          </div>
        ) : (
          skills.map((skill: any) => (
            <div key={skill.id} className="bg-gray-800/30 border border-cyan-500/20 rounded-lg p-4">
              <div className="flex items-start gap-4">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-400">Name</label>
                    <input
                      type="text"
                      value={skill.name}
                      onChange={(e) => handleUpdateSkill(skill.id, 'name', e.target.value)}
                      className="w-full px-2 py-1 bg-gray-800/50 border border-cyan-500/30 rounded text-gray-100 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Formula</label>
                    <input
                      type="text"
                      value={skill.formula}
                      onChange={(e) => handleUpdateSkill(skill.id, 'formula', e.target.value)}
                      className="w-full px-2 py-1 bg-gray-800/50 border border-cyan-500/30 rounded text-gray-100 focus:outline-none focus:border-cyan-500/50"
                      placeholder="e.g., INT+DEX"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Value %</label>
                    <input
                      type="number"
                      value={skill.value}
                      onChange={(e) => handleUpdateSkill(skill.id, 'value', parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-gray-800/50 border border-cyan-500/30 rounded text-gray-100 focus:outline-none focus:border-cyan-500/50"
                      min="0"
                      max="200"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-400">Notes</label>
                    <input
                      type="text"
                      value={skill.note || ""}
                      onChange={(e) => handleUpdateSkill(skill.id, 'note', e.target.value)}
                      className="w-full px-2 py-1 bg-gray-800/50 border border-cyan-500/30 rounded text-gray-100 focus:outline-none focus:border-cyan-500/50"
                      placeholder="Optional notes..."
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <button
                    onClick={() => handleUpdateSkill(skill.id, 'fumbled', !skill.fumbled)}
                    className={`p-2 rounded-lg transition-colors ${
                      skill.fumbled
                        ? 'bg-amber-600/20 border border-amber-500/50 text-amber-300'
                        : 'bg-gray-800/30 border border-gray-600/30 text-gray-500'
                    }`}
                    title="Fumbled this session"
                  >
                    <AlertCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRemoveSkill(skill.id)}
                    className="p-2 bg-red-600/20 border border-red-500/50 rounded-lg hover:bg-red-600/30 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SkillsTab;
