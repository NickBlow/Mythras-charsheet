import { Camera, Upload, X, Plus } from "lucide-react";

interface InfoTabProps {
  character: any;
  updateInfo: (updates: any) => void;
  characterImage: string | null;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const InfoTab = ({
  character,
  updateInfo,
  characterImage,
  onImageUpload,
}: InfoTabProps) => {
  const handleCareerAdd = () => {
    updateInfo({
      careers: [...(character.info.careers || []), ""],
    });
  };

  const handleCareerChange = (index: number, value: string) => {
    const newCareers = [...(character.info.careers || [])];
    newCareers[index] = value;
    updateInfo({ careers: newCareers });
  };

  const handleCareerRemove = (index: number) => {
    const newCareers = (character.info.careers || []).filter(
      (_: any, i: number) => i !== index
    );
    updateInfo({ careers: newCareers });
  };

  const handlePassionAdd = () => {
    updateInfo({
      passions: [...(character.info.passions || []), { name: "", value: 0 }],
    });
  };

  const handlePassionChange = (
    index: number,
    field: "name" | "value",
    value: any
  ) => {
    const newPassions = [...(character.info.passions || [])];
    newPassions[index] = { ...newPassions[index], [field]: value };
    updateInfo({ passions: newPassions });
  };

  const handlePassionRemove = (index: number) => {
    const newPassions = (character.info.passions || []).filter(
      (_: any, i: number) => i !== index
    );
    updateInfo({ passions: newPassions });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Character Image */}
      <div className="lg:col-span-1">
        <div className="hologram rounded-lg p-4">
          <label className="block text-sm font-medium text-cyan-300 mb-2">
            Character Image
          </label>
          <div className="relative">
            {characterImage ? (
              <div className="relative group">
                <img
                  src={characterImage}
                  alt="Character"
                  className="w-full h-64 object-cover rounded-lg border border-cyan-500/30"
                />
                <label className="absolute inset-0 flex items-center justify-center bg-gray-900/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-lg">
                  <div className="flex flex-col items-center">
                    <Upload className="w-8 h-8 mb-2 text-cyan-300" />
                    <span className="text-cyan-300 text-sm">Change Image</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-cyan-500/30 rounded-lg cursor-pointer hover:border-cyan-500/50 transition-colors">
                <Camera className="w-12 h-12 mb-3 text-cyan-500/50" />
                <span className="text-cyan-300/70">Upload Character Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={onImageUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Character Info */}
      <div className="lg:col-span-2 space-y-4">
        <div>
          <label className="block text-sm font-medium text-cyan-300 mb-1">
            Name
          </label>
          <input
            type="text"
            value={character.info.name || ""}
            onChange={(e) => updateInfo({ name: e.target.value })}
            className="w-full px-3 py-2 bg-gray-800/50 border border-cyan-500/30 rounded-lg text-gray-100 focus:outline-none focus:border-cyan-500/50"
            placeholder="Enter character name..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-cyan-300 mb-1">
            Culture
          </label>
          <input
            type="text"
            value={character.info.culture || ""}
            onChange={(e) => updateInfo({ culture: e.target.value })}
            className="w-full px-3 py-2 bg-gray-800/50 border border-cyan-500/30 rounded-lg text-gray-100 focus:outline-none focus:border-cyan-500/50"
            placeholder="Core Worlds, Outer Rim, etc..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-cyan-300 mb-1">
            Careers
          </label>
          <div className="space-y-2">
            {(character.info.careers || []).map(
              (career: string, index: number) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={career}
                    onChange={(e) => handleCareerChange(index, e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-800/50 border border-cyan-500/30 rounded-lg text-gray-100 focus:outline-none focus:border-cyan-500/50"
                    placeholder="Smuggler, Bounty Hunter, Imperial Officer..."
                  />
                  <button
                    onClick={() => handleCareerRemove(index)}
                    className="px-3 py-2 bg-red-600/20 border border-red-500/50 rounded-lg hover:bg-red-600/30 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )
            )}
            <button
              onClick={handleCareerAdd}
              className="px-4 py-2 bg-cyan-600/20 border border-cyan-500/50 rounded-lg hover:bg-cyan-600/30 transition-colors w-full"
            >
              Add Career
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-cyan-300 mb-1">
            Experience Rolls Available
          </label>
          <input
            type="number"
            value={character.info.experienceRolls || 0}
            onChange={(e) =>
              updateInfo({ experienceRolls: parseInt(e.target.value) || 0 })
            }
            className="w-full px-3 py-2 bg-gray-800/50 border border-cyan-500/30 rounded-lg text-gray-100 focus:outline-none focus:border-cyan-500/50"
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-cyan-300 mb-1">
            Notes
          </label>
          <textarea
            value={character.info.notes || ""}
            onChange={(e) => updateInfo({ notes: e.target.value })}
            className="w-full px-3 py-2 bg-gray-800/50 border border-cyan-500/30 rounded-lg text-gray-100 focus:outline-none focus:border-cyan-500/50 h-32"
            placeholder="Character background, personality, goals..."
          />
        </div>
      </div>

      {/* Passions Section */}
      <div className="lg:col-span-3 mt-6">
        <h3 className="text-lg font-semibold text-cyan-300 mb-3">Passions</h3>
        <div className="space-y-2">
          {/* Special Affinity to the Light */}
          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium text-yellow-400 w-48">
              Affinity to the Light
            </span>
            <input
              type="number"
              value={character.info.affinityToLight || 0}
              onChange={(e) =>
                updateInfo({ affinityToLight: parseInt(e.target.value) || 0 })
              }
              className="w-20 px-2 py-1 bg-gray-800/50 border border-yellow-500/30 rounded-lg text-gray-100 text-center focus:outline-none focus:border-yellow-500/50"
              min="0"
              max="100"
            />
            <span className="text-xs text-gray-400">%</span>
          </div>

          {/* Regular Passions */}
          {(character.info.passions || []).map(
            (passion: any, index: number) => (
              <div key={index} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={passion.name}
                  onChange={(e) =>
                    handlePassionChange(index, "name", e.target.value)
                  }
                  className="flex-1 max-w-xs px-3 py-1 bg-gray-800/50 border border-cyan-500/30 rounded-lg text-gray-100 focus:outline-none focus:border-cyan-500/50"
                  placeholder="Loyalty to the Republic, Hate Empire, etc..."
                />
                <input
                  type="number"
                  value={passion.value}
                  onChange={(e) =>
                    handlePassionChange(
                      index,
                      "value",
                      parseInt(e.target.value) || 0
                    )
                  }
                  className="w-20 px-2 py-1 bg-gray-800/50 border border-cyan-500/30 rounded-lg text-gray-100 text-center focus:outline-none focus:border-cyan-500/50"
                  min="0"
                  max="100"
                />
                <span className="text-xs text-gray-400">%</span>
                <button
                  onClick={() => handlePassionRemove(index)}
                  className="p-1 bg-red-600/20 border border-red-500/50 rounded hover:bg-red-600/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )
          )}
          <button
            onClick={handlePassionAdd}
            className="px-4 py-2 bg-cyan-600/20 border border-cyan-500/50 rounded-lg hover:bg-cyan-600/30 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Passion
          </button>
        </div>
      </div>
    </div>
  );
};

export default InfoTab;
