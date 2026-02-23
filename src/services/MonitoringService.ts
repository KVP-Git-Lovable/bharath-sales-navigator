import { FirebasePerformance } from '@capacitor-firebase/performance';

class MonitoringService {
  // We store the ID here so it can be automatically added to any future trace
  private currentUserId: string | null = null;

  /**
   * 1. AT LOGIN: Call this to identify the user for Performance traces.
   */
  async identifyUser(userId: string) {
    this.currentUserId = userId;
    console.log(`[Performance] User ID ${userId} is now globally linked to traces.`);
  }

  /**
   * 2. MEASURING SLOWNESS: Wrap any code block to measure its speed.
   */
  async trace<T>(traceName: string, action: () => Promise<T>): Promise<T> {
    // A. Start the timer
    await FirebasePerformance.startTrace({ traceName });

    // B. Proactively attach the user_id if we have one
    if (this.currentUserId) {
      await FirebasePerformance.putAttribute({
        traceName: traceName,
        attribute: 'user_id',
        value: this.currentUserId,
      });
    }

    try {
      // C. Execute your feature code (API call, heavy logic, etc.)
      return await action();
    } finally {
      // D. Always stop the timer so data is sent to Firebase
      await FirebasePerformance.stopTrace({ traceName });
    }
  }

  /**
   * Optional: Clear user on logout
   */
  logout() {
    this.currentUserId = null;
  }
}

export const monitoring = new MonitoringService();
