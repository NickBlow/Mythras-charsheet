import { Plus, X, Star, ChevronUp, ChevronDown } from "lucide-react";
import { useState } from "react";

interface OrdersTabProps {
  orders: any[];
  updateCharacter: (updates: any) => void;
}

const OrdersTab = ({ orders, updateCharacter }: OrdersTabProps) => {
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [newOrderName, setNewOrderName] = useState("");
  const [newOrderRank, setNewOrderRank] = useState("");
  const [newOrderNotes, setNewOrderNotes] = useState("");

  const handleAddOrder = () => {
    if (!newOrderName) return;

    const newOrder = {
      id: Date.now(),
      name: newOrderName,
      rank: newOrderRank,
      notes: newOrderNotes,
      joined: new Date().toLocaleDateString(),
    };

    updateCharacter({ orders: [...orders, newOrder] });
    setNewOrderName("");
    setNewOrderRank("");
    setNewOrderNotes("");
    setShowAddOrder(false);
  };

  const handleUpdateOrder = (id: number, field: string, value: any) => {
    const updatedOrders = orders.map((order: any) =>
      order.id === id ? { ...order, [field]: value } : order
    );
    updateCharacter({ orders: updatedOrders });
  };

  const handleRemoveOrder = (id: number) => {
    const updatedOrders = orders.filter((order: any) => order.id !== id);
    updateCharacter({ orders: updatedOrders });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-cyan-300 glow-cyan flex items-center gap-2">
          <Star className="w-5 h-5" />
          Orders & Organizations
        </h3>
        <button
          onClick={() => setShowAddOrder(true)}
          className="px-4 py-2 bg-cyan-600/20 border border-cyan-500/50 rounded-lg hover:bg-cyan-600/30 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Join Order
        </button>
      </div>

      {/* Add Order Form */}
      {showAddOrder && (
        <div className="bg-gray-800/50 border border-cyan-500/30 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-cyan-300 mb-2">
              Organization Name
            </label>
            <input
              type="text"
              value={newOrderName}
              onChange={(e) => setNewOrderName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800/50 border border-cyan-500/30 rounded-lg text-gray-100 focus:outline-none focus:border-cyan-500/50"
              placeholder="Jedi Order, Rebel Alliance, Empire, Bounty Hunters Guild..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-cyan-300 mb-2">
              Rank / Position
            </label>
            <input
              type="text"
              value={newOrderRank}
              onChange={(e) => setNewOrderRank(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800/50 border border-cyan-500/30 rounded-lg text-gray-100 focus:outline-none focus:border-cyan-500/50"
              placeholder="Padawan, Knight, Captain, Agent..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-cyan-300 mb-2">
              Notes
            </label>
            <textarea
              value={newOrderNotes}
              onChange={(e) => setNewOrderNotes(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800/50 border border-cyan-500/30 rounded-lg text-gray-100 focus:outline-none focus:border-cyan-500/50"
              placeholder="Special responsibilities, achievements, contacts..."
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddOrder}
              disabled={!newOrderName}
              className="flex-1 px-4 py-2 bg-green-600/20 border border-green-500/50 rounded-lg hover:bg-green-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowAddOrder(false);
                setNewOrderName("");
                setNewOrderRank("");
                setNewOrderNotes("");
              }}
              className="flex-1 px-4 py-2 bg-red-600/20 border border-red-500/50 rounded-lg hover:bg-red-600/30 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Orders List */}
      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No organizations joined yet. Click "Join Order" to add affiliations.
          </div>
        ) : (
          orders.map((order: any) => (
            <div key={order.id} className="hologram rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      type="text"
                      value={order.name}
                      onChange={(e) => handleUpdateOrder(order.id, 'name', e.target.value)}
                      className="text-lg font-semibold bg-transparent border-b border-cyan-500/30 text-cyan-300 focus:outline-none focus:border-cyan-500"
                      placeholder="Organization name..."
                    />
                    <div className="flex items-center gap-1">
                      {order.rank && (
                        <>
                          <ChevronUp className="w-4 h-4 text-green-400" />
                          <input
                            type="text"
                            value={order.rank}
                            onChange={(e) => handleUpdateOrder(order.id, 'rank', e.target.value)}
                            className="px-2 py-1 bg-gray-800/50 border border-cyan-500/30 rounded text-sm text-gray-300 focus:outline-none focus:border-cyan-500/50"
                            placeholder="Rank"
                          />
                        </>
                      )}
                    </div>
                  </div>
                  <textarea
                    value={order.notes || ""}
                    onChange={(e) => handleUpdateOrder(order.id, 'notes', e.target.value)}
                    className="w-full px-2 py-1 bg-gray-800/30 border border-cyan-500/20 rounded text-sm text-gray-300 focus:outline-none focus:border-cyan-500/50"
                    placeholder="Notes about this affiliation..."
                    rows={2}
                  />
                  <div className="text-xs text-gray-500 mt-2">
                    Joined: {order.joined || "Unknown"}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveOrder(order.id)}
                  className="ml-4 p-2 bg-red-600/20 border border-red-500/50 rounded-lg hover:bg-red-600/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Faction Reference */}
      <div className="mt-8">
        <h4 className="text-lg font-semibold text-cyan-300 mb-3">Common Factions</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            "Jedi Order",
            "Sith Empire",
            "Galactic Empire",
            "Rebel Alliance",
            "First Order",
            "Resistance",
            "Bounty Hunters Guild",
            "Hutt Cartel",
            "Black Sun",
            "Crimson Dawn",
            "Mandalorians",
            "Trade Federation",
          ].map((faction) => (
            <div key={faction} className="bg-gray-800/30 border border-cyan-500/20 rounded px-3 py-2 text-sm text-gray-300">
              {faction}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrdersTab;
