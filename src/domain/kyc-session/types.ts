export const KYC_SESSION_STATUSES = [
	"ACTIVE",
	"IN_PROGRESS",
	"SUBMITTED",
	"PENDING_REVIEW",
	"APPROVED",
	"REJECTED",
	"EXPIRED",
	"REVOKED",
] as const;

export type KycSessionStatus = (typeof KYC_SESSION_STATUSES)[number];

export const KYC_IDENTIFICATION_TIERS = [
	"ALWAYS",
	"ABOVE_THRESHOLD",
	"BELOW_THRESHOLD",
] as const;

export type KycIdentificationTier = (typeof KYC_IDENTIFICATION_TIERS)[number];

export const KYC_SESSION_EVENT_TYPES = [
	"session_created",
	"session_accessed",
	"session_started",
	"personal_info_updated",
	"document_uploaded",
	"shareholder_added",
	"shareholder_updated",
	"beneficial_controller_added",
	"beneficial_controller_updated",
	"address_added",
	"session_submitted",
	"session_approved",
	"session_rejected",
	"email_sent",
	"session_revoked",
	"session_expired",
] as const;

export type KycSessionEventType = (typeof KYC_SESSION_EVENT_TYPES)[number];

export const KYC_EDITABLE_SECTIONS = [
	"personal_info",
	"documents",
	"shareholders",
	"beneficial_controllers",
	"addresses",
] as const;

export type KycEditableSection = (typeof KYC_EDITABLE_SECTIONS)[number];

export interface KycSessionEntity {
	id: string;
	organizationId: string;
	clientId: string;
	token: string;
	status: KycSessionStatus;
	expiresAt: string;
	createdBy: string; // user ID or "system"
	emailSentAt: string | null;
	startedAt: string | null;
	submittedAt: string | null;
	reviewedAt: string | null;
	reviewedBy: string | null;
	rejectionReason: string | null;
	editableSections: KycEditableSection[] | null;
	uploadLinkId: string | null;
	// Threshold awareness (Art. 17 LFPIORPI)
	identificationTier: KycIdentificationTier;
	thresholdAmountMxn: number | null;
	clientCumulativeMxn: number | null;
	// Progress tracking
	completedSections: KycEditableSection[] | null;
	lastActivityAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface KycSessionEventEntity {
	id: string;
	sessionId: string;
	eventType: KycSessionEventType;
	actorIp: string | null;
	actorType: "client" | "admin" | "system";
	actorId: string | null;
	payload: Record<string, unknown> | null;
	createdAt: string;
}
