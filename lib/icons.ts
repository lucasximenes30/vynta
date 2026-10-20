import {
  Activity, Apple, Bike, BookOpen, Brain, Camera, ClipboardList, Code, Coffee, CreditCard, Crown,
  Droplets, Dumbbell, Edit2, Filter, Flame, Heart, Key, LayoutDashboard, Leaf, MessageCircle, Moon,
  Music, Pencil, Power, Settings, ShieldAlert, Smile, Star, Sun, Target, Trash2, Trophy, User,
  UserPlus, Users, Wind, Zap,
  type LucideIcon,
} from 'lucide-react'

// Explicit map of icons referenced by name (stored in the DB or in config objects).
// Looking icons up on the whole `lucide-react` namespace forces every icon into the bundle.
const NAMED_ICONS: Record<string, LucideIcon> = {
  Activity, Apple, Bike, BookOpen, Brain, Camera, ClipboardList, Code, Coffee, CreditCard, Crown,
  Droplets, Dumbbell, Edit2, Filter, Flame, Heart, Key, LayoutDashboard, Leaf, MessageCircle, Moon,
  Music, Pencil, Power, Settings, ShieldAlert, Smile, Star, Sun, Target, Trash2, Trophy, User,
  UserPlus, Users, Wind, Zap,
}

export function getIconByName(name: string | null | undefined, fallback: LucideIcon = Target): LucideIcon {
  return (name && NAMED_ICONS[name]) || fallback
}
