import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-surface-2 group-[.toaster]:text-text group-[.toaster]:border-wire group-[.toaster]: group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-text-dim",
          actionButton: "group-[.toast]:bg-cream group-[.toast]:text-[var(--ink)]",
          cancelButton: "group-[.toast]:bg-surface-3 group-[.toast]:text-text-dim",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
