export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_roles: {
        Row: {
          college_id: string | null
          created_at: string
          id: string
          is_admin: boolean
          name: string
          pages: string[]
          updated_at: string
        }
        Insert: {
          college_id?: string | null
          created_at?: string
          id: string
          is_admin?: boolean
          name: string
          pages?: string[]
          updated_at?: string
        }
        Update: {
          college_id?: string | null
          created_at?: string
          id?: string
          is_admin?: boolean
          name?: string
          pages?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_roles_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          college_id: string
          data: Json
          id: string
          updated_at: string
        }
        Insert: {
          college_id?: string
          data?: Json
          id?: string
          updated_at?: string
        }
        Update: {
          college_id?: string
          data?: Json
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: true
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          batch_id: string | null
          college_id: string
          course_id: string | null
          created_at: string
          date: string
          id: string
          remarks: string | null
          status: string
          student_id: string
          teacher_id: string | null
        }
        Insert: {
          batch_id?: string | null
          college_id?: string
          course_id?: string | null
          created_at?: string
          date: string
          id: string
          remarks?: string | null
          status: string
          student_id: string
          teacher_id?: string | null
        }
        Update: {
          batch_id?: string | null
          college_id?: string
          course_id?: string | null
          created_at?: string
          date?: string
          id?: string
          remarks?: string | null
          status?: string
          student_id?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          academic_year: string | null
          code: string
          college_id: string
          course_id: string | null
          created_at: string
          id: string
          name: string
          schedule: string | null
        }
        Insert: {
          academic_year?: string | null
          code: string
          college_id?: string
          course_id?: string | null
          created_at?: string
          id: string
          name: string
          schedule?: string | null
        }
        Update: {
          academic_year?: string | null
          code?: string
          college_id?: string
          course_id?: string | null
          created_at?: string
          id?: string
          name?: string
          schedule?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batches_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      college_members: {
        Row: {
          college_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          college_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          college_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_members_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      colleges: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string | null
          setup_completed: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string | null
          setup_completed?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string | null
          setup_completed?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          code: string
          college_id: string
          created_at: string
          description: string | null
          duration: string | null
          end_date: string | null
          group_name: string | null
          id: string
          name: string
          start_date: string | null
        }
        Insert: {
          code: string
          college_id?: string
          created_at?: string
          description?: string | null
          duration?: string | null
          end_date?: string | null
          group_name?: string | null
          id: string
          name: string
          start_date?: string | null
        }
        Update: {
          code?: string
          college_id?: string
          created_at?: string
          description?: string | null
          duration?: string | null
          end_date?: string | null
          group_name?: string | null
          id?: string
          name?: string
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_marks: {
        Row: {
          college_id: string
          created_at: string
          exam_id: string
          grade: string
          id: string
          marks: number
          student_id: string
        }
        Insert: {
          college_id?: string
          created_at?: string
          exam_id: string
          grade?: string
          id: string
          marks?: number
          student_id: string
        }
        Update: {
          college_id?: string
          created_at?: string
          exam_id?: string
          grade?: string
          id?: string
          marks?: number
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_marks_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          batch_id: string | null
          college_id: string
          created_at: string
          date: string
          id: string
          max_marks: number
          name: string
          subject_id: string | null
          type: string
        }
        Insert: {
          batch_id?: string | null
          college_id?: string
          created_at?: string
          date?: string
          id: string
          max_marks?: number
          name: string
          subject_id?: string | null
          type?: string
        }
        Update: {
          batch_id?: string | null
          college_id?: string
          created_at?: string
          date?: string
          id?: string
          max_marks?: number
          name?: string
          subject_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_packages: {
        Row: {
          amount: number
          college_id: string
          created_at: string
          description: string
          id: string
          name: string
        }
        Insert: {
          amount?: number
          college_id?: string
          created_at?: string
          description?: string
          id: string
          name: string
        }
        Update: {
          amount?: number
          college_id?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_packages_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      student_payments: {
        Row: {
          amount: number
          college_id: string
          created_at: string
          id: string
          month: string
          package_id: string | null
          paid_on: string
          student_id: string
        }
        Insert: {
          amount?: number
          college_id?: string
          created_at?: string
          id: string
          month: string
          package_id?: string | null
          paid_on?: string
          student_id: string
        }
        Update: {
          amount?: number
          college_id?: string
          created_at?: string
          id?: string
          month?: string
          package_id?: string | null
          paid_on?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_payments_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          batch_id: string | null
          college_id: string
          course_id: string | null
          created_at: string
          dob: string | null
          email: string | null
          full_name: string
          gender: string | null
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          nic: string | null
          phone: string | null
          photo_url: string | null
          registration_date: string | null
          status: string | null
          student_id: string
        }
        Insert: {
          address?: string | null
          batch_id?: string | null
          college_id?: string
          course_id?: string | null
          created_at?: string
          dob?: string | null
          email?: string | null
          full_name: string
          gender?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id: string
          nic?: string | null
          phone?: string | null
          photo_url?: string | null
          registration_date?: string | null
          status?: string | null
          student_id: string
        }
        Update: {
          address?: string | null
          batch_id?: string | null
          college_id?: string
          course_id?: string | null
          created_at?: string
          dob?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          nic?: string | null
          phone?: string | null
          photo_url?: string | null
          registration_date?: string | null
          status?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_sheets: {
        Row: {
          college_id: string
          created_at: string
          key: string
          spreadsheet_id: string
        }
        Insert: {
          college_id?: string
          created_at?: string
          key: string
          spreadsheet_id: string
        }
        Update: {
          college_id?: string
          created_at?: string
          key?: string
          spreadsheet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_sheets_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          college_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          joined_date: string | null
          phone: string | null
          photo_url: string | null
          qualification: string | null
          status: string | null
          subject_id: string | null
          subject_ids: string[] | null
        }
        Insert: {
          college_id?: string
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          joined_date?: string | null
          phone?: string | null
          photo_url?: string | null
          qualification?: string | null
          status?: string | null
          subject_id?: string | null
          subject_ids?: string[] | null
        }
        Update: {
          college_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          joined_date?: string | null
          phone?: string | null
          photo_url?: string | null
          qualification?: string | null
          status?: string | null
          subject_id?: string | null
          subject_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_access: {
        Row: {
          college_id: string | null
          created_at: string
          role_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          college_id?: string | null
          created_at?: string
          role_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          college_id?: string | null
          created_at?: string
          role_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_access_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_access_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "app_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          college_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          college_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          college_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_my_setup: { Args: never; Returns: undefined }
      create_my_college: { Args: { _name: string }; Returns: string }
      current_college_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      save_app_settings: { Args: { _data: Json }; Returns: undefined }
      save_subject_sheet: {
        Args: { _key: string; _spreadsheet_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "staff"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff"],
    },
  },
} as const
