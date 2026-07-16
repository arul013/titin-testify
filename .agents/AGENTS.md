# Custom Workspace Rules for Learning Nexus Exam

Before starting any task, coding, or modifications in this workspace, you MUST read and comply with these guidelines:

## UI Components & Design System Rules
- **DO NOT** use legacy UI components located at `frontend/src/components/ui/` (e.g., `Button.tsx`, `Card.tsx`, `Input.tsx`, `Modal.tsx`, `Toast.tsx`).
- **ALWAYS** use the modern, token-driven, component-driven design system elements located at **`frontend/src/components/ui/ui/`** (e.g. `button.tsx`, `card.tsx`, `input.tsx`, `modal.tsx`, `toast.tsx`, `checkbox.tsx`, etc.).
- When importing, import the components directly from `@/components/ui/ui/<name>` or relatively from their path (e.g., `../../components/ui/ui/button`).
- Ensure you use the updated props for the new components:
  - For `button.tsx`: use `loading` instead of `isLoading`.
  - For `modal.tsx`: use `open` instead of `isOpen`.
  - For `card.tsx`: use appropriate variants like `variant="default"`, `variant="interactive"`, etc., instead of `hoverEffect`.
  
## Coding Principles
- Keep custom CSS to a minimum. Let Tailwind CSS v4 variables defined in `globals.css` govern styling.
- Keep components presentation-focused and decouple business logic.
