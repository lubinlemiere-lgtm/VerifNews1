export interface Category {
  id: number;
  slug: string;
  name: string;
  icon: string | null;
  description: string | null;
}

export interface PreferenceItem {
  category_id: number;
  category_name: string;
  category_slug: string;
  is_subscribed: boolean;
  notification_enabled: boolean;
}
