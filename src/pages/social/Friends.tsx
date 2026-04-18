import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, Search, Check, X, Loader2, UserMinus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

const Friends = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Stubbed data
  const friendRecords: any[] = [];
  const friendUserIds: string[] = [];
  const friendProfiles: any[] = [];
  const friendXp: Record<string, number> = {};

  const profileMap = new Map((friendProfiles ?? []).map((p) => [p.user_id, p]));

  const accepted = (friendRecords ?? []).filter((f) => f.status === "accepted");
  const pendingReceived = (friendRecords ?? []).filter(
    (f) => f.status === "pending" && f.addressee_id === user?.uid
  );
  const pendingSent = (friendRecords ?? []).filter(
    (f) => f.status === "pending" && f.requester_id === user?.uid
  );

  const getInitials = (name: string | null) =>
    (name || "??").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const handleSearch = async () => {
    if (!search.trim() || !user) return;
    setSearching(true);
    // Stubbed search
    setSearchResults([]);
    setSearching(false);
  };

  const sendRequest = async (addresseeId: string) => {
    if (!user) return;
    toast.success("Friend request sent!");
  };

  const acceptRequest = async (friendId: string) => {
    toast.success("Friend request accepted!");
  };

  const removeFriend = async (friendId: string) => {
    toast.success("Removed");
  };

  // Check if a user is already a friend or has pending request
  const existingIds = new Set((friendRecords ?? []).flatMap((f) => [f.requester_id, f.addressee_id]));

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-accent" />
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Friends</h1>
          <p className="text-muted-foreground text-sm">Study together, improve faster</p>
        </div>
      </div>

      {/* Search / Add friend */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-10 h-10"
          />
        </div>
        <Button onClick={handleSearch} disabled={searching} className="bg-navy text-highlight hover:bg-navy/90 gap-2">
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Search
        </Button>
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Search Results</h3>
          {searchResults.map((p) => (
            <div key={p.user_id} className="flex items-center gap-4 bg-card border border-border rounded-xl px-4 py-3">
              <div className="h-10 w-10 rounded-full bg-navy flex items-center justify-center text-highlight text-sm font-bold">
                {getInitials(p.full_name)}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">{p.full_name || "Unknown"}</div>
              </div>
              {existingIds.has(p.user_id) ? (
                <span className="text-xs text-muted-foreground">Already connected</span>
              ) : (
                <Button size="sm" onClick={() => sendRequest(p.user_id)} className="bg-accent text-accent-foreground text-xs gap-1">
                  <UserPlus className="h-3 w-3" /> Add
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pending received */}
      {pendingReceived.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Pending Requests</h3>
          {pendingReceived.map((f) => {
            const profile = profileMap.get(f.requester_id);
            return (
              <div key={f.id} className="flex items-center gap-4 bg-secondary/50 border border-accent/20 rounded-xl px-4 py-3">
                <div className="h-10 w-10 rounded-full bg-navy flex items-center justify-center text-highlight text-sm font-bold">
                  {getInitials(profile?.full_name ?? null)}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{profile?.full_name || "Unknown"}</div>
                  <div className="text-xs text-muted-foreground">Wants to be friends</div>
                </div>
                <Button size="sm" onClick={() => acceptRequest(f.id)} className="bg-accent text-accent-foreground text-xs gap-1">
                  <Check className="h-3 w-3" /> Accept
                </Button>
                <button onClick={() => removeFriend(f.id)} className="text-muted-foreground hover:text-destructive">
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Friend list */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">
          Friends {accepted.length > 0 && `(${accepted.length})`}
        </h3>
        {accepted.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center bg-card border border-border rounded-xl">
            No friends yet. Search for people to add!
          </div>
        ) : (
          accepted.map((f) => {
            const friendId = f.requester_id === user?.id ? f.addressee_id : f.requester_id;
            const profile = profileMap.get(friendId);
            const xp = (friendXp ?? {})[friendId] ?? 0;
            return (
              <div key={f.id} className="flex items-center gap-4 bg-card border border-border rounded-xl px-4 py-3">
                <div className="h-10 w-10 rounded-full bg-navy flex items-center justify-center text-highlight text-sm font-bold">
                  {getInitials(profile?.full_name ?? null)}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{profile?.full_name || "Unknown"}</div>
                </div>
                <span className="text-sm font-bold text-accent">{xp.toLocaleString()} XP</span>
                <button onClick={() => removeFriend(f.id)} className="text-muted-foreground hover:text-destructive" title="Remove friend">
                  <UserMinus className="h-4 w-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Pending sent */}
      {pendingSent.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Sent Requests</h3>
          {pendingSent.map((f) => {
            const profile = profileMap.get(f.addressee_id);
            return (
              <div key={f.id} className="flex items-center gap-4 bg-card border border-border rounded-xl px-4 py-3 opacity-60">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-sm font-bold">
                  {getInitials(profile?.full_name ?? null)}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{profile?.full_name || "Unknown"}</div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </div>
                <button onClick={() => removeFriend(f.id)} className="text-muted-foreground hover:text-destructive text-xs">
                  Cancel
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Friends;
