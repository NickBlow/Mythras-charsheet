import { Plus, X, Swords, Shield, Package, Weight } from "lucide-react";
import { useState } from "react";

interface EquipmentTabProps {
  equipment: any;
  updateCharacter: (updates: any) => void;
}

const EquipmentTab = ({ equipment, updateCharacter }: EquipmentTabProps) => {
  const [activeSection, setActiveSection] = useState<
    "weapons" | "armor" | "misc"
  >("weapons");
  const [showAddItem, setShowAddItem] = useState(false);

  const handleAddWeapon = () => {
    const newWeapon = {
      id: Date.now(),
      name: "",
      damage: "",
      range: "",
      firingRate: "",
      ammo: 0,
      load: 0,
      traits: "",
      enc: 0,
      addDamageModifier: false,
    };
    updateCharacter({
      equipment: {
        ...equipment,
        weapons: [...(equipment.weapons || []), newWeapon],
      },
    });
  };

  const handleUpdateWeapon = (id: number, field: string, value: any) => {
    const updatedWeapons = equipment.weapons.map((weapon: any) =>
      weapon.id === id ? { ...weapon, [field]: value } : weapon
    );
    updateCharacter({
      equipment: { ...equipment, weapons: updatedWeapons },
    });
  };

  const handleRemoveWeapon = (id: number) => {
    const updatedWeapons = equipment.weapons.filter((w: any) => w.id !== id);
    updateCharacter({
      equipment: { ...equipment, weapons: updatedWeapons },
    });
  };

  const handleAddArmor = () => {
    const newArmor = {
      id: Date.now(),
      name: "",
      armorPoints: 0,
      locations: ["All"],
      enc: 0,
      cost: "",
      notes: "",
    };
    updateCharacter({
      equipment: {
        ...equipment,
        armor: [...(equipment.armor || []), newArmor],
      },
    });
  };

  const handleUpdateArmor = (id: number, field: string, value: any) => {
    const updatedArmor = equipment.armor.map((armor: any) =>
      armor.id === id ? { ...armor, [field]: value } : armor
    );
    updateCharacter({
      equipment: { ...equipment, armor: updatedArmor },
    });
  };

  const handleRemoveArmor = (id: number) => {
    const updatedArmor = equipment.armor.filter((a: any) => a.id !== id);
    updateCharacter({
      equipment: { ...equipment, armor: updatedArmor },
    });
  };

  const handleAddMisc = () => {
    const newItem = {
      id: Date.now(),
      name: "",
      quantity: 1,
      enc: 0,
      notes: "",
    };
    updateCharacter({
      equipment: {
        ...equipment,
        misc: [...(equipment.misc || []), newItem],
      },
    });
  };

  const handleUpdateMisc = (id: number, field: string, value: any) => {
    const updatedMisc = equipment.misc.map((item: any) =>
      item.id === id ? { ...item, [field]: value } : item
    );
    updateCharacter({
      equipment: { ...equipment, misc: updatedMisc },
    });
  };

  const handleRemoveMisc = (id: number) => {
    const updatedMisc = equipment.misc.filter((i: any) => i.id !== id);
    updateCharacter({
      equipment: { ...equipment, misc: updatedMisc },
    });
  };

  // Calculate total encumbrance
  const totalEnc =
    (equipment.weapons?.reduce(
      (sum: number, w: any) => sum + (w.enc || 0),
      0
    ) || 0) +
    (equipment.armor?.reduce((sum: number, a: any) => sum + (a.enc || 0), 0) ||
      0) +
    (equipment.misc?.reduce(
      (sum: number, i: any) => sum + (i.enc || 0) * (i.quantity || 1),
      0
    ) || 0);

  return (
    <div className="space-y-6">
      {/* Header with Encumbrance */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-cyan-300 glow-cyan flex items-center gap-2">
          <Package className="w-5 h-5" />
          Equipment & Inventory
        </h3>
        <div className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 border border-purple-500/50 rounded-lg">
          <Weight className="w-4 h-4 text-purple-400" />
          <span className="text-purple-300">Total ENC: {totalEnc}</span>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 border-b border-cyan-500/20">
        <button
          onClick={() => setActiveSection("weapons")}
          className={`px-4 py-2 flex items-center gap-2 transition-colors ${
            activeSection === "weapons"
              ? "border-b-2 border-cyan-500 text-cyan-300"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <Swords className="w-4 h-4" />
          Weapons
        </button>
        <button
          onClick={() => setActiveSection("armor")}
          className={`px-4 py-2 flex items-center gap-2 transition-colors ${
            activeSection === "armor"
              ? "border-b-2 border-cyan-500 text-cyan-300"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <Shield className="w-4 h-4" />
          Armor
        </button>
        <button
          onClick={() => setActiveSection("misc")}
          className={`px-4 py-2 flex items-center gap-2 transition-colors ${
            activeSection === "misc"
              ? "border-b-2 border-cyan-500 text-cyan-300"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <Package className="w-4 h-4" />
          Misc
        </button>
      </div>

      {/* Weapons Section */}
      {activeSection === "weapons" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={handleAddWeapon}
              className="px-4 py-2 bg-cyan-600/20 border border-cyan-500/50 rounded-lg hover:bg-cyan-600/30 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Weapon
            </button>
          </div>

          {/* Example from image: Blaster Pistol */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-cyan-300 border-b border-cyan-500/20">
                  <th className="pb-2">Weapon</th>
                  <th className="pb-2">Damage</th>
                  <th className="pb-2">+DM</th>
                  <th className="pb-2">Range</th>
                  <th className="pb-2">Fire Rate</th>
                  <th className="pb-2">Ammo</th>
                  <th className="pb-2">Load</th>
                  <th className="pb-2">Traits</th>
                  <th className="pb-2">ENC</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {(equipment.weapons || []).map((weapon: any) => (
                  <tr key={weapon.id} className="border-b border-gray-800">
                    <td className="py-2">
                      <input
                        type="text"
                        value={weapon.name}
                        onChange={(e) =>
                          handleUpdateWeapon(weapon.id, "name", e.target.value)
                        }
                        className="w-full bg-gray-800/30 border border-cyan-500/20 rounded px-2 py-1 text-gray-100 focus:outline-none focus:border-cyan-500/50"
                        placeholder="Blaster Pistol"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="text"
                        value={weapon.damage}
                        onChange={(e) =>
                          handleUpdateWeapon(
                            weapon.id,
                            "damage",
                            e.target.value
                          )
                        }
                        className="w-20 bg-gray-800/30 border border-cyan-500/20 rounded px-2 py-1 text-gray-100 focus:outline-none focus:border-cyan-500/50"
                        placeholder="1d8"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="checkbox"
                        checked={weapon.addDamageModifier || false}
                        onChange={(e) =>
                          handleUpdateWeapon(
                            weapon.id,
                            "addDamageModifier",
                            e.target.checked
                          )
                        }
                        className="w-4 h-4 bg-gray-800/30 border border-cyan-500/20 rounded text-cyan-600 focus:ring-cyan-500"
                        title="Add damage modifier"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="text"
                        value={weapon.range}
                        onChange={(e) =>
                          handleUpdateWeapon(weapon.id, "range", e.target.value)
                        }
                        className="w-24 bg-gray-800/30 border border-cyan-500/20 rounded px-2 py-1 text-gray-100 focus:outline-none focus:border-cyan-500/50"
                        placeholder="10/30/120"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="text"
                        value={weapon.firingRate}
                        onChange={(e) =>
                          handleUpdateWeapon(
                            weapon.id,
                            "firingRate",
                            e.target.value
                          )
                        }
                        className="w-16 bg-gray-800/30 border border-cyan-500/20 rounded px-2 py-1 text-gray-100 focus:outline-none focus:border-cyan-500/50"
                        placeholder="1"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="number"
                        value={weapon.ammo}
                        onChange={(e) =>
                          handleUpdateWeapon(
                            weapon.id,
                            "ammo",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-16 bg-gray-800/30 border border-cyan-500/20 rounded px-2 py-1 text-gray-100 focus:outline-none focus:border-cyan-500/50"
                        placeholder="100"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="number"
                        value={weapon.load}
                        onChange={(e) =>
                          handleUpdateWeapon(
                            weapon.id,
                            "load",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-16 bg-gray-800/30 border border-cyan-500/20 rounded px-2 py-1 text-gray-100 focus:outline-none focus:border-cyan-500/50"
                        placeholder="3"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="text"
                        value={weapon.traits}
                        onChange={(e) =>
                          handleUpdateWeapon(
                            weapon.id,
                            "traits",
                            e.target.value
                          )
                        }
                        className="w-32 bg-gray-800/30 border border-cyan-500/20 rounded px-2 py-1 text-gray-100 focus:outline-none focus:border-cyan-500/50"
                        placeholder="Cauterising"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="number"
                        value={weapon.enc}
                        onChange={(e) =>
                          handleUpdateWeapon(
                            weapon.id,
                            "enc",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-16 bg-gray-800/30 border border-cyan-500/20 rounded px-2 py-1 text-gray-100 focus:outline-none focus:border-cyan-500/50"
                        placeholder="1"
                      />
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => handleRemoveWeapon(weapon.id)}
                        className="p-1 bg-red-600/20 border border-red-500/50 rounded hover:bg-red-600/30 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Armor Section */}
      {activeSection === "armor" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={handleAddArmor}
              className="px-4 py-2 bg-cyan-600/20 border border-cyan-500/50 rounded-lg hover:bg-cyan-600/30 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Armor
            </button>
          </div>

          <div className="space-y-3">
            {(equipment.armor || []).map((armor: any) => (
              <div
                key={armor.id}
                className="bg-gray-800/30 border border-cyan-500/20 rounded-lg p-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-400">Name</label>
                    <input
                      type="text"
                      value={armor.name}
                      onChange={(e) =>
                        handleUpdateArmor(armor.id, "name", e.target.value)
                      }
                      className="w-full px-2 py-1 bg-gray-800/50 border border-cyan-500/30 rounded text-gray-100 focus:outline-none focus:border-cyan-500/50"
                      placeholder="Armoured Flight Suit"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">AP</label>
                    <input
                      type="number"
                      value={armor.armorPoints}
                      onChange={(e) =>
                        handleUpdateArmor(
                          armor.id,
                          "armorPoints",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-full px-2 py-1 bg-gray-800/50 border border-cyan-500/30 rounded text-gray-100 focus:outline-none focus:border-cyan-500/50"
                      placeholder="4"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-400">Locations</label>
                    <select
                      value={armor.locations === "All" ? "All" : "Custom"}
                      onChange={(e) => {
                        if (e.target.value === "All") {
                          handleUpdateArmor(armor.id, "locations", "All");
                        } else {
                          handleUpdateArmor(armor.id, "locations", []);
                        }
                      }}
                      className="w-full px-2 py-1 bg-gray-800/50 border border-cyan-500/30 rounded text-gray-100 focus:outline-none focus:border-cyan-500/50"
                    >
                      <option value="All">All Locations</option>
                      <option value="Custom">Select Specific</option>
                    </select>
                    {armor.locations !== "All" && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {[
                          "Head",
                          "Chest",
                          "Abdomen",
                          "Left Arm",
                          "Right Arm",
                          "Left Leg",
                          "Right Leg",
                        ].map((loc) => (
                          <label
                            key={loc}
                            className="flex items-center text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={
                                Array.isArray(armor.locations) &&
                                armor.locations.includes(loc)
                              }
                              onChange={(e) => {
                                const current = Array.isArray(armor.locations)
                                  ? armor.locations
                                  : [];
                                if (e.target.checked) {
                                  handleUpdateArmor(armor.id, "locations", [
                                    ...current,
                                    loc,
                                  ]);
                                } else {
                                  handleUpdateArmor(
                                    armor.id,
                                    "locations",
                                    current.filter((l: string) => l !== loc)
                                  );
                                }
                              }}
                              className="mr-1"
                            />
                            {loc}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">ENC</label>
                    <input
                      type="number"
                      value={armor.enc}
                      onChange={(e) =>
                        handleUpdateArmor(
                          armor.id,
                          "enc",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-full px-2 py-1 bg-gray-800/50 border border-cyan-500/30 rounded text-gray-100 focus:outline-none focus:border-cyan-500/50"
                      placeholder="5"
                    />
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={armor.cost || ""}
                    onChange={(e) =>
                      handleUpdateArmor(armor.id, "cost", e.target.value)
                    }
                    className="flex-1 px-2 py-1 bg-gray-800/50 border border-cyan-500/30 rounded text-gray-100 focus:outline-none focus:border-cyan-500/50"
                    placeholder="Cost: 4,000 Cr"
                  />
                  <input
                    type="text"
                    value={armor.notes || ""}
                    onChange={(e) =>
                      handleUpdateArmor(armor.id, "notes", e.target.value)
                    }
                    className="flex-1 px-2 py-1 bg-gray-800/50 border border-cyan-500/30 rounded text-gray-100 focus:outline-none focus:border-cyan-500/50"
                    placeholder="Notes (vacuum rated, etc.)"
                  />
                  <button
                    onClick={() => handleRemoveArmor(armor.id)}
                    className="p-2 bg-red-600/20 border border-red-500/50 rounded hover:bg-red-600/30 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Misc Equipment Section */}
      {activeSection === "misc" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={handleAddMisc}
              className="px-4 py-2 bg-cyan-600/20 border border-cyan-500/50 rounded-lg hover:bg-cyan-600/30 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>

          <div className="space-y-3">
            {(equipment.misc || []).map((item: any) => (
              <div
                key={item.id}
                className="bg-gray-800/30 border border-cyan-500/20 rounded-lg p-3 flex gap-3 items-center"
              >
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) =>
                    handleUpdateMisc(item.id, "name", e.target.value)
                  }
                  className="flex-1 px-2 py-1 bg-gray-800/50 border border-cyan-500/30 rounded text-gray-100 focus:outline-none focus:border-cyan-500/50"
                  placeholder="Item name"
                />
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">Qty:</span>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      handleUpdateMisc(
                        item.id,
                        "quantity",
                        parseInt(e.target.value) || 1
                      )
                    }
                    className="w-16 px-2 py-1 bg-gray-800/50 border border-cyan-500/30 rounded text-gray-100 focus:outline-none focus:border-cyan-500/50"
                    min="1"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">ENC:</span>
                  <input
                    type="number"
                    value={item.enc}
                    onChange={(e) =>
                      handleUpdateMisc(
                        item.id,
                        "enc",
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="w-16 px-2 py-1 bg-gray-800/50 border border-cyan-500/30 rounded text-gray-100 focus:outline-none focus:border-cyan-500/50"
                    min="0"
                  />
                </div>
                <input
                  type="text"
                  value={item.notes || ""}
                  onChange={(e) =>
                    handleUpdateMisc(item.id, "notes", e.target.value)
                  }
                  className="flex-1 max-w-xs px-2 py-1 bg-gray-800/50 border border-cyan-500/30 rounded text-gray-100 focus:outline-none focus:border-cyan-500/50"
                  placeholder="Notes"
                />
                <button
                  onClick={() => handleRemoveMisc(item.id)}
                  className="p-1 bg-red-600/20 border border-red-500/50 rounded hover:bg-red-600/30 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentTab;
