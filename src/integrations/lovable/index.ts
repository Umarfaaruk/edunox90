// Lovable integration removed — OAuth now handled via supabase.auth.signInWithOAuth()
// This file is kept for compatibility but should not be imported.
export const lovable = {
  auth: {
    signInWithOAuth: async (_provider: string, _opts?: { redirect_uri?: string }) => {
      console.warn("lovable.auth.signInWithOAuth is deprecated. Use supabase.auth.signInWithOAuth instead.");
      return { error: new Error("Use supabase.auth.signInWithOAuth instead") };
    },
  },
};
