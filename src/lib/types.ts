export type Category = "badminton" | "study" | "tutoring" | "community";
export type SparkStatus =
  | "DRAFT"
  | "BLOCKED"
  | "MATCHING"
  | "PROPOSED"
  | "AWAITING_CONFIRMATION"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED";
export type RequirementKind =
  | "participant"
  | "tutor"
  | "racket"
  | "room"
  | "venue"
  | "facilitator"
  | "projector";
export type TimeWindow = { start: string; end: string };
export type Requirement = {
  id: string;
  kind: RequirementKind;
  quantity: number;
  skill?: string;
  capacity?: number;
};
export type Profile = {
  id: string;
  name: string;
  city: string;
  age: "adult" | "youth";
  interests: string[];
  availability: string[];
  experience: string;
  subjects: string[];
  communityTypes: string[];
  onboarded: boolean;
  discoverable: boolean;
  hubDirectoryVisible?: boolean;
  preferredActivities?: string[];
  schoolHubId?: string | null;
};
export type HubKind =
  "school" | "university" | "club" | "organization" | "community";
export type MemberRole = "hub_admin" | "organizer" | "member";
export type HubMember = {
  hubId: string;
  userId: string;
  name: string;
  role: MemberRole;
  status: "approved" | "pending" | "rejected";
  tutorApproved: boolean;
  directoryVisible: boolean;
  interests: string[];
  subjects: string[];
  age?: "adult" | "youth";
};
export type Membership = {
  hubId: string;
  name: string;
  role: MemberRole;
  status: "approved" | "pending" | "rejected";
  kind: HubKind;
  visibility: "public" | "private";
};
export type HubInvite = {
  id: string;
  hubId: string;
  code?: string;
  expiresAt: string;
  used: boolean;
};
export type ImpactMetrics = {
  registered: number;
  sparksCreated: number;
  unlocked: number;
  confirmed: number;
  completed: number;
  participatingAdults: number;
  participatingStudents: number;
  resolved: number;
  baseline: number;
};
export type Hub = {
  id: string;
  name: string;
  city: string;
  description: string;
  visibility: "public" | "private";
  youthApproved: boolean;
  approved: boolean;
  category: Category;
  members: number;
  joined?: boolean;
  pending?: boolean;
  admin?: boolean;
  kind?: HubKind;
  role?: MemberRole;
  ownerId?: string;
};
export type Spark = {
  id: string;
  title: string;
  description: string;
  category: Category;
  city: string;
  hubId: string | null;
  ownerId: string;
  status: SparkStatus;
  target: number;
  participantIds: string[];
  windows: TimeWindow[];
  conflicts?: TimeWindow[];
  requirements: Requirement[];
  budget: number;
  skill: string;
  createdAt: string;
  saved?: boolean;
  subject?: string;
  academicLevel?: string;
  learningGoals?: string;
  gameMode?: "singles" | "doubles" | "casual";
  venueId?: string | null;
  spaceLabel?: string;
  bookingStatus?: "planned" | "booked";
  bookingReference?: string;
};
export type Candidate = {
  id: string;
  ownerId: string;
  label: string;
  kind: RequirementKind;
  city: string;
  hubId: string | null;
  age: "adult" | "youth";
  approved: boolean;
  optedIn: boolean;
  skills: string[];
  windows: TimeWindow[];
  quantity: number;
  capacity: number;
  cost: number;
  commitments: number;
  needs: Requirement[];
  reservations: TimeWindow[];
};
export type Action = {
  id: string;
  candidateId: string;
  ownerId: string;
  label: string;
  kind: RequirementKind;
  quantity: number;
  cost: number;
  explanation: string;
  state: "pending" | "accepted" | "declined";
};
export type Proposal = {
  id: string;
  sparkId: string;
  window: TimeWindow | null;
  blockers: string[];
  remainingBlockers: string[];
  actions: Action[];
  feasible: boolean;
  explored: number;
  truncated: boolean;
  alternatives: TimeWindow[];
  baselineResolved: number;
  resolved: number;
  commitments: number;
  cost: number;
  score: number[];
  createdAt: string;
};
export type Report = {
  reporterId?: string;
  id: string;
  sparkId: string;
  reason: string;
  status: "open" | "resolved";
  createdAt: string;
};
export type NearbySettings = {
  areaId: string | null;
  bio: string;
  visible: boolean;
};
export type NearbyPerson = {
  id: string;
  name: string;
  areaId: string;
  bio: string;
  interests: string[];
  subjects: string[];
  experience: string;
  availability: string[];
};
export type Connection = {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
};
export type ConnectionPerson = {
  id: string;
  name: string;
  city: string;
  age: "adult" | "youth";
  interests: string[];
  sharedHubIds: string[];
};
export type ChatMessage = {
  id: string;
  hubId: string | null;
  connectionId: string | null;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
  removed?: boolean;
};
export type AppState = {
  profile: Profile;
  hubs: Hub[];
  sparks: Spark[];
  candidates: Candidate[];
  proposals: Proposal[];
  reports: Report[];
  blocked: string[];
  joined: string[];
  saved: string[];
  notifications: { id: string; text: string; read: boolean; href?: string }[];
  nearbySettings?: NearbySettings;
  nearbyPeople?: NearbyPerson[];
  hubMembers?: HubMember[];
  memberships?: Membership[];
  hubInvites?: HubInvite[];
  impact?: ImpactMetrics;
  accountMode?: "local" | "supabase";
  demoVersion?: number;
  connections?: Connection[];
  connectionPeople?: ConnectionPerson[];
  messages?: ChatMessage[];
  schoolDirectory?: { id: string; name: string; city: string; kind: string }[];
  declines?: { sparkId: string; candidateId: string }[];
  attendance?: { sparkId: string; userId: string }[];
  platformAdmin?: boolean;
  membershipRequests?: { hubId: string; userId: string; status: string }[];
  participationRequests?: {
    id: string;
    sparkId: string;
    userId: string;
    status: string;
  }[];
};
