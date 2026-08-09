// Hand-written to match supabase/migrations exactly. If you have the Supabase
// CLI linked to a live project you can regenerate this with:
//   npx supabase gen types typescript --linked > src/types/database.types.ts

export type MemberRole = "owner" | "employee";
export type MemberStatus = "active" | "removed";
export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";
export type ItemStatus = "active" | "archived";
export type AdjustmentType =
  | "stock_added"
  | "manual_correction"
  | "damaged"
  | "lost"
  | "returned"
  | "other";
export type EventStatus = "upcoming" | "active" | "closed";
export type TransactionStatus = "completed" | "voided";
export type PaymentMethodCode = "cash" | "cashapp" | "card";
export type ActivityActionType =
  | "business_created"
  | "business_updated"
  | "employee_invited"
  | "employee_joined"
  | "employee_removed"
  | "employee_role_changed"
  | "item_created"
  | "item_updated"
  | "item_archived"
  | "inventory_adjusted"
  | "event_created"
  | "event_started"
  | "event_closed"
  | "event_reopened"
  | "sale_completed"
  | "sale_voided"
  | "cash_count_recorded";

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<
        {
          id: string;
          full_name: string;
          email: string;
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id: string;
          full_name?: string;
          email: string;
          phone?: string | null;
          avatar_url?: string | null;
        },
        {
          full_name?: string;
          phone?: string | null;
          avatar_url?: string | null;
        }
      >;
      businesses: Table<
        {
          id: string;
          name: string;
          logo_url: string | null;
          owner_id: string;
          email: string;
          phone: string | null;
          default_currency: string;
          timezone: string;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          name: string;
          logo_url?: string | null;
          owner_id: string;
          email: string;
          phone?: string | null;
          default_currency?: string;
          timezone?: string;
        },
        {
          name?: string;
          logo_url?: string | null;
          email?: string;
          phone?: string | null;
          default_currency?: string;
          timezone?: string;
        }
      >;
      business_settings: Table<
        {
          business_id: string;
          allow_negative_inventory: boolean;
          employees_can_adjust_inventory: boolean;
          employees_can_void_own_recent_transactions: boolean;
          employees_can_manage_events: boolean;
          void_window_minutes: number;
          created_at: string;
          updated_at: string;
        },
        {
          business_id: string;
          allow_negative_inventory?: boolean;
          employees_can_adjust_inventory?: boolean;
          employees_can_void_own_recent_transactions?: boolean;
          employees_can_manage_events?: boolean;
          void_window_minutes?: number;
        },
        {
          allow_negative_inventory?: boolean;
          employees_can_adjust_inventory?: boolean;
          employees_can_void_own_recent_transactions?: boolean;
          employees_can_manage_events?: boolean;
          void_window_minutes?: number;
        }
      >;
      business_members: Table<
        {
          id: string;
          business_id: string;
          user_id: string;
          role: MemberRole;
          status: MemberStatus;
          invited_by: string | null;
          joined_at: string;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          business_id: string;
          user_id: string;
          role: MemberRole;
          status?: MemberStatus;
          invited_by?: string | null;
        },
        {
          role?: MemberRole;
          status?: MemberStatus;
        }
      >;
      business_invitations: Table<
        {
          id: string;
          business_id: string;
          email: string;
          role: MemberRole;
          token_hash: string;
          status: InvitationStatus;
          invited_by: string;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          business_id: string;
          email: string;
          role: MemberRole;
          token_hash: string;
          status?: InvitationStatus;
          invited_by: string;
          expires_at: string;
        },
        {
          status?: InvitationStatus;
        }
      >;
      payment_methods: Table<
        {
          id: string;
          code: PaymentMethodCode;
          label: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        },
        {
          id?: string;
          code: PaymentMethodCode;
          label: string;
          sort_order?: number;
          is_active?: boolean;
        }
      >;
      inventory_items: Table<
        {
          id: string;
          business_id: string;
          name: string;
          category: string;
          color: string;
          sku: string | null;
          description: string | null;
          image_url: string | null;
          quantity: number;
          cost: number;
          price: number;
          low_stock_threshold: number | null;
          status: ItemStatus;
          has_variants: boolean;
          variant_label: string | null;
          created_by: string;
          updated_by: string;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          business_id: string;
          name: string;
          category: string;
          color?: string;
          sku?: string | null;
          description?: string | null;
          image_url?: string | null;
          quantity?: number;
          cost?: number;
          price?: number;
          low_stock_threshold?: number | null;
          status?: ItemStatus;
          has_variants?: boolean;
          variant_label?: string | null;
          created_by: string;
          updated_by: string;
        },
        {
          name?: string;
          category?: string;
          color?: string;
          sku?: string | null;
          description?: string | null;
          image_url?: string | null;
          price?: number;
          cost?: number;
          low_stock_threshold?: number | null;
          status?: ItemStatus;
          has_variants?: boolean;
          variant_label?: string | null;
          quantity?: number;
          updated_by?: string;
        }
      >;
      inventory_adjustments: Table<
        {
          id: string;
          business_id: string;
          inventory_item_id: string;
          variant_id: string | null;
          variant_label: string | null;
          adjustment_type: AdjustmentType;
          previous_quantity: number;
          quantity_change: number;
          new_quantity: number;
          note: string | null;
          employee_id: string;
          created_at: string;
        },
        {
          id?: string;
          business_id: string;
          inventory_item_id: string;
          variant_id?: string | null;
          variant_label?: string | null;
          adjustment_type: AdjustmentType;
          previous_quantity: number;
          quantity_change: number;
          new_quantity: number;
          note?: string | null;
          employee_id: string;
        }
      >;
      inventory_item_variants: Table<
        {
          id: string;
          business_id: string;
          item_id: string;
          value: string;
          quantity: number;
          price: number;
          created_by: string;
          updated_by: string;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          business_id: string;
          item_id: string;
          value: string;
          quantity?: number;
          price?: number;
          created_by: string;
          updated_by: string;
        },
        {
          value?: string;
          price?: number;
          updated_by?: string;
        }
      >;
      events: Table<
        {
          id: string;
          business_id: string;
          name: string;
          event_date: string;
          start_time: string | null;
          end_time: string | null;
          location: string | null;
          notes: string | null;
          status: EventStatus;
          created_by: string;
          closed_at: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          business_id: string;
          name: string;
          event_date: string;
          start_time?: string | null;
          end_time?: string | null;
          location?: string | null;
          notes?: string | null;
          status?: EventStatus;
          created_by: string;
        },
        {
          name?: string;
          event_date?: string;
          start_time?: string | null;
          end_time?: string | null;
          location?: string | null;
          notes?: string | null;
        }
      >;
      transactions: Table<
        {
          id: string;
          business_id: string;
          event_id: string;
          employee_id: string;
          occurred_at: string;
          payment_method_id: string;
          subtotal: number;
          total: number;
          note: string | null;
          status: TransactionStatus;
          voided_at: string | null;
          voided_by: string | null;
          void_reason: string | null;
          created_at: string;
        },
        never
      >;
      transaction_items: Table<
        {
          id: string;
          transaction_id: string;
          inventory_item_id: string | null;
          variant_id: string | null;
          item_name: string;
          item_type: string;
          color: string;
          quantity: number;
          unit_price: number;
          unit_cost: number;
          line_total: number;
          created_at: string;
        },
        never
      >;
      cash_counts: Table<
        {
          id: string;
          business_id: string;
          event_id: string;
          starting_cash: number;
          recorded_cash_sales: number;
          expected_cash: number;
          actual_cash: number;
          difference: number;
          note: string | null;
          employee_id: string;
          counted_at: string;
        },
        never
      >;
      activity_logs: Table<
        {
          id: string;
          business_id: string;
          actor_id: string;
          action_type: ActivityActionType;
          entity_type: string;
          entity_id: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
        },
        never
      >;
    };
    Views: Record<string, never>;
    Functions: {
      create_business: {
        Args: {
          p_name: string;
          p_owner_name: string;
          p_email: string;
          p_phone?: string | null;
          p_default_currency?: string;
          p_timezone?: string;
          p_logo_url?: string | null;
        };
        Returns: string;
      };
      invite_employee: {
        Args: { p_business_id: string; p_email: string };
        Returns: { invitation_id: string; token: string }[];
      };
      get_invitation_preview: {
        Args: { p_token: string };
        Returns: {
          business_id: string;
          business_name: string;
          email: string;
          role: MemberRole;
          status: InvitationStatus;
          expires_at: string;
        }[];
      };
      accept_invitation: {
        Args: { p_token: string };
        Returns: string;
      };
      adjust_inventory: {
        Args: {
          p_item_id: string;
          p_adjustment_type: AdjustmentType;
          p_note?: string | null;
          p_delta?: number | null;
          p_set_to?: number | null;
          p_variant_id?: string | null;
        };
        Returns: string;
      };
      complete_sale: {
        Args: {
          p_event_id: string;
          p_payment_method_code: PaymentMethodCode;
          p_items: { inventory_item_id: string; variant_id?: string | null; quantity: number }[];
          p_note?: string | null;
        };
        Returns: string;
      };
      void_transaction: {
        Args: { p_transaction_id: string; p_reason: string };
        Returns: string;
      };
      start_event: {
        Args: { p_event_id: string };
        Returns: string;
      };
      close_event: {
        Args: {
          p_event_id: string;
          p_actual_cash?: number | null;
          p_starting_cash?: number;
          p_note?: string | null;
        };
        Returns: string;
      };
      reopen_event: {
        Args: { p_event_id: string };
        Returns: string;
      };
      record_cash_count: {
        Args: {
          p_event_id: string;
          p_actual_cash: number;
          p_starting_cash?: number;
          p_note?: string | null;
        };
        Returns: string;
      };
    };
  };
}
