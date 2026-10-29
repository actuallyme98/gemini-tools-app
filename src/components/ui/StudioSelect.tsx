import {
  Children,
  Fragment,
  isValidElement,
  useState,
  useRef,
  useId,
  type ReactNode,
  type ComponentProps,
  type ComponentType,
} from "react";
import * as Select from "@radix-ui/react-select";
import {
  Check,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock3,
  FilePenLine,
  CircleHelp,
  Layers3,
  Store,
  Package,
  BookOpen,
  Image,
  Palette,
  Cpu,
  Users,
  ShieldCheck,
  CalendarClock,
  SlidersHorizontal,
  FileImage,
  XCircle,
  Play,
  LoaderCircle,
  Server,
  Wallet,
} from "lucide-react";
import "../../styles/select.css";

type Kind =
  | "status"
  | "store"
  | "product"
  | "skill"
  | "thumbnail"
  | "scene"
  | "model"
  | "role"
  | "time"
  | "format";
type Option = {
  value: string;
  label: ReactNode;
  text: string;
  disabled: boolean;
};
const empty = "__studio_empty__";
const icons: Record<
  string,
  ComponentType<{ size?: number; "aria-hidden"?: boolean; className?: string }>
> = {
  draft: FilePenLine,
  pending: Clock3,
  changes_requested: CircleHelp,
  approved: CheckCircle2,
  failed: XCircle,
  partial_failed: CircleHelp,
  done: CheckCircle2,
  running: LoaderCircle,
  queued: Clock3,
  scheduled: CalendarClock,
  interrupted: CircleHelp,
  cancelled: XCircle,
  now: Play,
  night: CalendarClock,
  admin: ShieldCheck,
  designer: Users,
  seller: Users,
  leader: ShieldCheck,
  product: Package,
  skill: BookOpen,
  thumbnail: Image,
  scene: Palette,
  png: FileImage,
  jpg: FileImage,
  image: Image,
  text: FilePenLine,
  vision: Image,
  api: Server,
  worker: Cpu,
  CREDIT: Wallet,
  USD: Wallet,
  false: CheckCircle2,
  true: XCircle,
  blocked: CircleHelp,
};
const kindIcons = {
  status: Layers3,
  store: Store,
  product: Package,
  skill: BookOpen,
  thumbnail: Image,
  scene: Palette,
  model: Cpu,
  role: Users,
  time: CalendarClock,
  format: FileImage,
};
function textOf(node: ReactNode): string {
  return Children.toArray(node)
    .map((n) =>
      isValidElement<{ children?: ReactNode }>(n)
        ? textOf(n.props.children)
        : String(n),
    )
    .join("");
}
function optionsOf(children: ReactNode): Option[] {
  return Children.toArray(children).flatMap((child) => {
    if (
      !isValidElement<{
        value?: string | number;
        children?: ReactNode;
        disabled?: boolean;
        label?: string;
      }>(child)
    )
      return [];
    if (child.type === Fragment || child.type === "optgroup")
      return optionsOf(child.props.children);
    if (child.type !== "option") return [];
    return [
      {
        value: String(child.props.value ?? textOf(child.props.children)),
        label: child.props.children,
        text: child.props.label ?? textOf(child.props.children),
        disabled: !!child.props.disabled,
      },
    ];
  });
}
export function StudioSelect({
  children,
  value,
  defaultValue,
  onChange,
  kind,
  className,
  id,
  name,
  disabled,
  required,
  ...props
}: Omit<
  ComponentProps<"select">,
  "onChange" | "multiple" | "size" | "value" | "defaultValue"
> & {
  value?: string | number;
  defaultValue?: string | number;
  kind?: Kind;
  onChange?: (event: { target: { value: string; name?: string } }) => void;
}) {
  const options = optionsOf(children);
  const [internal, setInternal] = useState(
    String(defaultValue ?? options[0]?.value ?? ""),
  );
  const selected = String(value ?? internal);
  const current = options.find((o) => o.value === selected);
  const trigger = useRef<HTMLButtonElement>(null);
  const [invalid, setInvalid] = useState(false);
  const errorId = useId();
  const fallback = kind ? kindIcons[kind] : SlidersHorizontal;
  const Icon = icons[selected] ?? fallback;
  return (
    <Select.Root
      value={selected || empty}
      onValueChange={(next) => {
        const result = next === empty ? "" : next;
        setInternal(result);
        setInvalid(false);
        onChange?.({ target: { value: result, name } });
      }}
      disabled={disabled}
      required={required}
    >
      <Select.Trigger
        ref={trigger}
        id={id}
        className={`studio-select-trigger ${className ?? ""}`}
        aria-label={props["aria-label"]}
        aria-labelledby={props["aria-labelledby"]}
        aria-describedby={
          [props["aria-describedby"], invalid ? errorId : undefined]
            .filter(Boolean)
            .join(" ") || undefined
        }
        aria-invalid={invalid || props["aria-invalid"]}
        data-value={selected}
      >
        <Icon size={16} aria-hidden className="studio-select-icon" />
        <Select.Value>
          <span>{current?.label ?? "Chọn…"}</span>
        </Select.Value>
        <Select.Icon>
          <ChevronDown size={15} aria-hidden />
        </Select.Icon>
      </Select.Trigger>
      <select
        name={name}
        required={required}
        disabled={disabled}
        value={selected}
        tabIndex={-1}
        aria-hidden="true"
        className="studio-select-native"
        onChange={(event) => {
          setInternal(event.target.value);
          setInvalid(false);
          onChange?.({ target: { value: event.target.value, name } });
        }}
        onInvalid={(event) => {
          event.preventDefault();
          setInvalid(true);
          trigger.current?.focus();
        }}
      >
        {!options.some((o) => o.value === "") && <option value="" />}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.text}
          </option>
        ))}
      </select>

      {invalid && (
        <span id={errorId} className="studio-select-validation" role="alert">
          Vui lòng chọn một mục.
        </span>
      )}
      <Select.Portal>
        <Select.Content
          className="studio-select-content"
          position="popper"
          sideOffset={6}
          collisionPadding={12}
        >
          <Select.ScrollUpButton className="studio-select-scroll">
            <ChevronUp size={15} aria-hidden />
          </Select.ScrollUpButton>
          <Select.Viewport className="studio-select-viewport">
            {options.map((option) => {
              const OptionIcon = icons[option.value] ?? fallback;
              return (
                <Select.Item
                  key={option.value || empty}
                  value={option.value || empty}
                  disabled={option.disabled}
                  textValue={option.text}
                  data-value={option.value}
                  className="studio-select-option"
                >
                  <OptionIcon
                    size={16}
                    aria-hidden
                    className="studio-select-icon"
                  />
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator>
                    <Check size={15} aria-hidden />
                  </Select.ItemIndicator>
                </Select.Item>
              );
            })}
          </Select.Viewport>
          <Select.ScrollDownButton className="studio-select-scroll">
            <ChevronDown size={15} aria-hidden />
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
