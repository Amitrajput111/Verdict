import { create } from 'zustand';
import { PostData } from '../components/PostCard';

interface PostState {
  posts: PostData[];
  repostedIds: string[];
  likedIds: string[];
  setPosts: (posts: PostData[]) => void;
  repostPost: (postId: string) => void;
  likePost: (postId: string) => void;
}

export const usePostStore = create<PostState>((set) => ({
  posts: [],
  repostedIds: [],
  likedIds: [],
  setPosts: (posts) => set({ posts }),
  repostPost: (postId) => set((state) => {
    const isAlreadyReposted = state.repostedIds.includes(postId);
    const nextReposts = isAlreadyReposted
      ? state.repostedIds.filter(id => id !== postId)
      : [...state.repostedIds, postId];

    const updatedPosts = state.posts.map((p) => {
      if (p.id === postId) {
        return {
          ...p,
          share_count: isAlreadyReposted ? Math.max(0, p.share_count - 1) : p.share_count + 1
        };
      }
      return p;
    });

    return {
      repostedIds: nextReposts,
      posts: updatedPosts
    };
  }),
  likePost: (postId) => set((state) => {
    const isAlreadyLiked = state.likedIds.includes(postId);
    const nextLikes = isAlreadyLiked
      ? state.likedIds.filter(id => id !== postId)
      : [...state.likedIds, postId];

    return {
      likedIds: nextLikes
    };
  }),
}));
export default usePostStore;
