// pub const SEED_PROFILE: &[u8] = b"profile";
// pub const SEED_LOAN: &[u8] = b"loan";

pub const SEED_PROFILE: &[u8] = b"profile";
pub const SEED_LOAN: &[u8] = b"pool";

// NEW
pub const SEED_VAULT: &[u8] = b"vault";
pub const SEED_POSITION: &[u8] = b"position";

// Status codes for RepaymentSchedule
pub const SCHEDULE_ACTIVE: u8 = 0;
pub const SCHEDULE_DEFAULTED: u8 = 1;
pub const SCHEDULE_COMPLETED: u8 = 2;