export type UserRole = "student" | "moderator" | "admin";

export type MoodStatus =
  | "studying"
  | "sleeping"
  | "gaming"
  | "music"
  | "chill"
  | "prayer"
  | null;

export type AvailabilityStatus =
  | "in_room"
  | "away"
  | "busy"
  | "available"
  | "sleeping";

export type MaintenanceStatus = "pending" | "in_progress" | "fixed";

export type MarketplaceStatus = "active" | "sold" | "reserved";

export type LostFoundType = "lost" | "found";

export interface ApprovedStudent {
  id: string;
  full_name: string;
  room_number: string;
  email: string;
  phone_number: string;
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  room_number: string | null;
  profile_photo: string | null;
  bio: string | null;
  mood_status: MoodStatus;
  availability_status: AvailabilityStatus;
  role: UserRole;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  audio_url?: string;
  created_at: string;
  user?: User;
  likes?: Like[];
  comments?: Comment[];
  _count?: {
    likes: number;
    comments: number;
  };
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: User;
}

export interface Like {
  id: string;
  user_id: string;
  post_id: string;
}

export interface Channel {
  id: string;
  name: string;
  description: string | null;
}

export interface ChannelMessage {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: User;
}

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  sender?: User;
  receiver?: User;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  created_by: string;
  pinned?: boolean;
  created_at: string;
  creator?: User;
}

export interface MaintenanceRequest {
  id: string;
  user_id: string;
  room_number: string;
  issue: string;
  status: MaintenanceStatus;
  created_at: string;
  user?: User;
}

export interface MarketplaceItem {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  price: number;
  image_url: string | null;
  status: MarketplaceStatus;
  created_at: string;
  seller?: User;
}

export interface Confession {
  id: string;
  content: string;
  approved: boolean;
  created_at: string;
}

export interface WhoHasRequest {
  id: string;
  user_id: string;
  item_name: string;
  description: string | null;
  resolved: boolean;
  created_at: string;
  user?: User;
}

export interface LostFoundItem {
  id: string;
  user_id: string;
  type: LostFoundType;
  title: string;
  description: string;
  image_url: string | null;
  created_at: string;
  user?: User;
}

export interface Poll {
  id: string;
  question: string;
  created_by: string;
  created_at: string;
  creator?: User;
  options?: PollOption[];
}

export interface PollOption {
  id: string;
  poll_id: string;
  option_text: string;
  votes: number;
}

export interface KnockNotification {
  from_user_id: string;
  to_user_id: string;
  room_number: string;
  timestamp: string;
}

export interface Reel {
  id: string;
  user_id: string;
  video_url: string;
  caption: string | null;
  created_at: string;
  user?: User;
  likes?: ReelLike[];
  _count?: {
    likes: number;
  };
}

export interface ReelLike {
  id: string;
  user_id: string;
  reel_id: string;
}

export interface ActiveLive {
  id: string;
  host_id: string;
  title: string;
  channel_id: string;
  viewer_count: number;
  started_at: string;
  is_active: boolean;
  host?: User;
}
