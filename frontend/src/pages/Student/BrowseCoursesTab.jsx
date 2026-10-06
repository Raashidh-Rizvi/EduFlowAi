import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  X,
  ArrowLeft,
  Clock,
  Users,
  BookOpen,
  Layers,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Eye,
  Loader2,
  SearchX,
  Award,
  Target,
} from "lucide-react";
import StarRating from "../../components/marketplace/StarRating";
import { marketplaceService } from "../../services/marketplaceService";
import { enrollmentService } from "../../services/enrollmentService";
import {
  formatDurationHours,
  formatMinutes,
  formatPrice,
  formatCount,
  levelLabel,
} from "../../utils/marketplaceFormat";

const LEVELS = [
  { value: "", label: "All levels" },
  { value: "Easy", label: "Beginner" },
  { value: "Medium", label: "Intermediate" },
  { value: "Hard", label: "Advanced" },
  { value: "Boss", label: "Expert" },
];

const SORTS = [
  { value: "popular", label: "Most popular" },
  { value: "rating", label: "Highest rated" },
  { value: "newest", label: "Newest" },
  { value: "title", label: "Title (A–Z)" },
  { value: "duration-asc", label: "Shortest" },
  { value: "duration-desc", label: "Longest" },
  { value: "price-asc", label: "Price: low → high" },
  { value: "price-desc", label: "Price: high → low" },
];

const DURATIONS = [
  { value: "", label: "Any" },
  { value: "0-5", label: "< 5h" },
  { value: "5-15", label: "5–15h" },
  { value: "15-30", label: "15–30h" },
  { value: "30-", label: "30h+" },
];

const RATINGS = [
  { value: "", label: "Any" },
  { value: "4.5", label: "4.5+" },
  { value: "4", label: "4.0+" },
  { value: "3.5", label: "3.5+" },
];

const PRICES = [
  { value: "all", label: "All" },
  { value: "free", label: "Free" },
  { value: "paid", label: "Paid" },
];

const PAGE_SIZE = 10;

const EMPTY_FILTERS = {
  category: "",
  level: "",
  price: "all",
  duration: "",
  minRating: "",
  sort: "popular",
};

const THUMB_FALLBACKS = [
  "linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)",
  "linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)",
  "linear-gradient(135deg, #10B981 0%, #3B82F6 100%)",
  "linear-gradient(135deg, #F59E0B 0%, #EC4899 100%)",
  "linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)",
];

function fallbackGradient(seed = "") {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1)
    hash = (hash + seed.charCodeAt(i)) % THUMB_FALLBACKS.length;
  return THUMB_FALLBACKS[hash];
}

function courseDuration(course) {
  return Number(course?.totalMinutes) > 0
    ? formatMinutes(course.totalMinutes)
    : formatDurationHours(course?.durationHours);
}

/** Mirrors the request statuses the Enrollment tab understands. */
function enrollmentFor(requests, courseId) {
  const match = (requests || []).find(
    (r) => String(r.courseId) === String(courseId),
  );
  if (!match) return null;
  const status = String(match.status || "Pending");
  if (["Rejected", "Cancelled", "Dropped"].includes(status)) return null;
  return status;
}

// ─── Small UI pieces ───────────────────────────────────────────────────────────

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flexShrink: 0,
        padding: "6px 12px",
        borderRadius: "var(--radius-full)",
        border: `1px solid ${active ? "var(--primary-border)" : "var(--border-subtle)"}`,
        background: active ? "var(--primary-soft)" : "var(--bg-surface)",
        color: active ? "var(--primary)" : "var(--text-muted)",
        fontSize: "12px",
        fontWeight: active ? 700 : 500,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function SheetGroup({ title, options, value, onChange }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div
        style={{
          fontSize: "11px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--text-muted)",
          marginBottom: "8px",
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {options.map((o) => (
          <Chip
            key={o.value || o.label}
            active={value === o.value}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Thumb({ course, height = 120, children }) {
  const [failed, setFailed] = useState(false);
  const hasImage = course.thumbnailUrl && !failed;
  return (
    <div
      style={{
        position: "relative",
        height,
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        background: hasImage
          ? "var(--bg-canvas)"
          : fallbackGradient(course.code || course.title || ""),
        flexShrink: 0,
      }}
    >
      {hasImage && (
        <img
          src={course.thumbnailUrl}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}
      {children}
    </div>
  );
}

function Badge({ children, tone = "neutral", style = {} }) {
  const tones = {
    neutral: { bg: "rgba(0,0,0,0.55)", fg: "#fff" },
    success: { bg: "var(--success-soft, rgba(16,185,129,0.15))", fg: "var(--success, #10B981)" },
    warning: { bg: "var(--warning-soft, rgba(245,158,11,0.15))", fg: "var(--warning, #F59E0B)" },
    primary: { bg: "var(--primary-soft)", fg: "var(--primary)" },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 8px",
        borderRadius: "var(--radius-full)",
        background: t.bg,
        color: t.fg,
        fontSize: "10.5px",
        fontWeight: 700,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

function StatusBadge({ status }) {
  if (!status) return null;
  if (status === "Pending")
    return <Badge tone="warning">Pending approval</Badge>;
  return (
    <Badge tone="success">
      <CheckCircle2 size={11} /> Enrolled
    </Badge>
  );
}

function BrowseCard({ course, status, onOpen }) {
  const price = formatPrice(course);
  const duration = courseDuration(course);
  const lessons = Number(course.lessonCount) || 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="card-premium hover-scale"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        padding: "10px",
        textAlign: "left",
        background: "var(--bg-card)",
        border: "1px solid var(--border-card)",
        borderRadius: "var(--radius-lg)",
        cursor: "pointer",
        color: "inherit",
        minWidth: 0,
      }}
    >
      <Thumb course={course}>
        <Badge style={{ position: "absolute", top: 8, left: 8 }}>
          {levelLabel(course.difficulty)}
        </Badge>
        <Badge
          tone={price === "Free" ? "success" : "neutral"}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            background: price === "Free" ? "#10B981" : "rgba(0,0,0,0.55)",
            color: "#fff",
          }}
        >
          {price}
        </Badge>
      </Thumb>
      <div style={{ display: "flex", flexDirection: "column", gap: "5px", minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span
            style={{
              fontSize: "10.5px",
              fontWeight: 700,
              color: "var(--secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {course.category || "General"}
          </span>
          <StatusBadge status={status} />
        </div>
        <div
          style={{
            fontSize: "14px",
            fontWeight: 700,
            color: "var(--text-main)",
            lineHeight: 1.3,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {course.title}
        </div>
        <div
          style={{
            fontSize: "11.5px",
            color: "var(--text-muted)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {course.instructorName || "EduFlow Instructor"}
        </div>
        <StarRating
          value={course.averageRating}
          count={course.ratingCount}
          size={12}
        />
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            fontSize: "11px",
            color: "var(--text-muted)",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <Clock size={11} /> {duration || "Self-paced"}
          </span>
          {lessons > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <BookOpen size={11} /> {lessons} lessons
            </span>
          )}
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <Users size={11} /> {formatCount(course.enrollmentCount)}
          </span>
        </div>
      </div>
    </button>
  );
}

function CardSkeleton() {
  return (
    <div
      style={{
        height: "250px",
        borderRadius: "var(--radius-lg)",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        opacity: 0.6,
        animation: "pulse 1.4s ease-in-out infinite",
      }}
    />
  );
}

// ─── Course detail (inside the portal) ─────────────────────────────────────────

function BrowseCourseDetail({ courseId, preview, status, onBack, onEnrolled, onOpenCourse }) {
  const [course, setCourse] = useState(preview || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openModules, setOpenModules] = useState(() => new Set());
  const [enrolling, setEnrolling] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    marketplaceService
      .getCourse(courseId)
      .then((data) => {
        if (!alive) return;
        setCourse(data);
        if (data?.modules?.[0]?.id) setOpenModules(new Set([data.modules[0].id]));
      })
      .catch((err) => {
        if (alive)
          setError(err?.friendlyMessage || "We could not load this course.");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [courseId]);

  const toggleModule = (id) =>
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleEnroll = async () => {
    setEnrolling(true);
    setMessage(null);
    try {
      await enrollmentService.requestEnrollment(courseId);
      setMessage({ ok: true, text: "Request sent — your instructor will review it." });
      await onEnrolled?.();
    } catch (err) {
      setMessage({
        ok: false,
        text:
          err?.response?.data?.message ||
          err?.friendlyMessage ||
          "We could not submit your enrollment. Please try again.",
      });
    } finally {
      setEnrolling(false);
    }
  };

  const modules = course?.modules || [];
  const outcomes = course?.learningOutcomes || [];
  const prerequisites = course?.prerequisites || [];
  const lessonTotal =
    Number(course?.lessonCount) ||
    modules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0);
  const hasAccess = status && status !== "Pending";

  const sectionTitle = (text, Icon) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "14px",
        fontWeight: 700,
        color: "var(--text-main)",
        margin: "18px 0 10px",
      }}
    >
      <Icon size={15} color="var(--primary)" /> {text}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <button
        type="button"
        onClick={onBack}
        className="btn-ghost"
        style={{
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 10px",
          fontSize: "12.5px",
          marginBottom: "8px",
        }}
      >
        <ArrowLeft size={14} /> Back to courses
      </button>

      {!course && loading ? (
        <CardSkeleton />
      ) : error && !course ? (
        <div style={{ textAlign: "center", padding: "40px 10px", color: "var(--text-muted)" }}>
          <p>{error}</p>
          <button type="button" className="btn-secondary" onClick={onBack}>
            Back
          </button>
        </div>
      ) : (
        <>
          <Thumb course={course} height={170} />

          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "12px" }}>
            <Badge tone="primary">{course.category || "General"}</Badge>
            <Badge tone="primary">{levelLabel(course.difficulty)}</Badge>
            <Badge tone={formatPrice(course) === "Free" ? "success" : "primary"}>
              {formatPrice(course)}
            </Badge>
            <StatusBadge status={status} />
          </div>

          <h2
            style={{
              fontSize: "20px",
              fontWeight: 800,
              color: "var(--text-main)",
              margin: "10px 0 4px",
              lineHeight: 1.25,
            }}
          >
            {course.title}
          </h2>
          <div style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
            by {course.instructorName || "EduFlow Instructor"}
          </div>
          <div style={{ marginTop: "6px" }}>
            <StarRating value={course.averageRating} count={course.ratingCount} size={13} />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
              gap: "8px",
              marginTop: "14px",
            }}
          >
            {[
              { icon: Clock, label: "Duration", value: courseDuration(course) || "Self-paced" },
              { icon: Layers, label: "Modules", value: modules.length || course.moduleCount || 0 },
              { icon: BookOpen, label: "Lessons", value: lessonTotal },
              { icon: Users, label: "Learners", value: formatCount(course.enrollmentCount) },
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                style={{
                  padding: "10px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  textAlign: "center",
                }}
              >
                <Icon size={14} color="var(--primary)" />
                <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text-main)" }}>
                  {value}
                </div>
                <div style={{ fontSize: "10.5px", color: "var(--text-muted)" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Primary action */}
          <div style={{ marginTop: "14px" }}>
            {hasAccess ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() => onOpenCourse(courseId)}
                style={{ width: "100%", padding: "11px", border: "none", cursor: "pointer" }}
              >
                Go to course <ChevronRight size={15} />
              </button>
            ) : status === "Pending" ? (
              <button
                type="button"
                className="btn-secondary"
                disabled
                style={{ width: "100%", padding: "11px" }}
              >
                Enrollment pending approval
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary"
                onClick={handleEnroll}
                disabled={enrolling}
                style={{ width: "100%", padding: "11px", border: "none", cursor: "pointer" }}
              >
                {enrolling ? (
                  <>
                    <Loader2 size={15} className="spin" /> Sending request…
                  </>
                ) : (
                  "Request enrollment"
                )}
              </button>
            )}
            {message && (
              <p
                role="status"
                style={{
                  fontSize: "12px",
                  marginTop: "8px",
                  color: message.ok ? "var(--success, #10B981)" : "var(--danger, #EF4444)",
                }}
              >
                {message.text}
              </p>
            )}
          </div>

          {(course.description || course.shortDescription) && (
            <>
              {sectionTitle("About this course", BookOpen)}
              <p
                style={{
                  fontSize: "13px",
                  lineHeight: 1.6,
                  color: "var(--text-muted)",
                  whiteSpace: "pre-line",
                  margin: 0,
                }}
              >
                {course.description || course.shortDescription}
              </p>
            </>
          )}

          {outcomes.length > 0 && (
            <>
              {sectionTitle("What you'll learn", Target)}
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "6px" }}>
                {outcomes.map((item) => (
                  <li
                    key={item}
                    style={{ display: "flex", gap: "8px", fontSize: "12.5px", color: "var(--text-main)" }}
                  >
                    <CheckCircle2 size={14} color="var(--success, #10B981)" style={{ flexShrink: 0, marginTop: 2 }} />
                    {item}
                  </li>
                ))}
              </ul>
            </>
          )}

          {sectionTitle(`Curriculum · ${modules.length} modules · ${lessonTotal} lessons`, Layers)}
          {loading && modules.length === 0 ? (
            <CardSkeleton />
          ) : modules.length === 0 ? (
            <p style={{ fontSize: "12.5px", color: "var(--text-muted)", margin: 0 }}>
              The instructor hasn't published the curriculum yet.
            </p>
          ) : (
            <div style={{ display: "grid", gap: "8px" }}>
              {modules.map((module, index) => {
                const open = openModules.has(module.id);
                const lessons = module.lessons || [];
                const minutes = lessons.reduce(
                  (sum, l) => sum + (Number(l.estimatedMinutes) || 0),
                  0,
                );
                return (
                  <div
                    key={module.id || index}
                    style={{
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-md)",
                      background: "var(--bg-surface)",
                      overflow: "hidden",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleModule(module.id)}
                      aria-expanded={open}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "11px 12px",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                        color: "var(--text-main)",
                      }}
                    >
                      <ChevronDown
                        size={15}
                        style={{
                          flexShrink: 0,
                          transform: open ? "rotate(0deg)" : "rotate(-90deg)",
                          transition: "transform 0.15s ease",
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: 700 }}>
                          {index + 1}. {module.title}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                          {lessons.length} lessons
                          {minutes > 0 ? ` · ${formatMinutes(minutes)}` : ""}
                          {module.quizCount ? ` · ${module.quizCount} quiz` : ""}
                        </div>
                      </div>
                    </button>
                    {open && (
                      <ul
                        style={{
                          listStyle: "none",
                          margin: 0,
                          padding: "0 12px 10px 37px",
                          display: "grid",
                          gap: "6px",
                        }}
                      >
                        {module.description && (
                          <li style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                            {module.description}
                          </li>
                        )}
                        {lessons.map((lesson) => (
                          <li
                            key={lesson.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              fontSize: "12.5px",
                              color: "var(--text-main)",
                            }}
                          >
                            <BookOpen size={12} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                            <span style={{ flex: 1, minWidth: 0 }}>{lesson.title}</span>
                            {lesson.isFreePreview && (
                              <Badge tone="success">
                                <Eye size={10} /> Preview
                              </Badge>
                            )}
                            {Number(lesson.estimatedMinutes) > 0 && (
                              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                {formatMinutes(lesson.estimatedMinutes)}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {prerequisites.length > 0 && (
            <>
              {sectionTitle("Prerequisites", Award)}
              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12.5px", color: "var(--text-muted)" }}>
                {prerequisites.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Browse tab ────────────────────────────────────────────────────────────────

export default function BrowseCoursesTab({ requests, onEnrolled, onOpenCourse }) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    marketplaceService
      .getCategories()
      .then((list) => setCategories(Array.isArray(list) ? list : []))
      .catch(() => {});
    return () => window.clearTimeout(debounceRef.current);
  }, []);

  const fetchPage = async (pageNumber, append) => {
    const requestId = ++requestIdRef.current;
    const [minDuration, maxDuration] = filters.duration
      ? filters.duration.split("-").map((p) => (p === "" ? null : Number(p)))
      : [null, null];
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await marketplaceService.getCourses({
        search,
        category: filters.category,
        level: filters.level,
        price: filters.price,
        minDuration,
        maxDuration,
        minRating: filters.minRating ? Number(filters.minRating) : null,
        sort: filters.sort,
        page: pageNumber,
        pageSize: PAGE_SIZE,
      });
      if (requestId !== requestIdRef.current) return;
      const next = res?.items || [];
      setItems((prev) => (append ? [...prev, ...next] : next));
      setTotal(res?.total || 0);
      setTotalPages(res?.totalPages || 1);
      setPage(pageNumber);
    } catch (err) {
      if (requestId === requestIdRef.current)
        setError(err?.friendlyMessage || "We could not load the course catalog.");
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    fetchPage(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filters]);

  const onSearchInput = (value) => {
    setSearchInput(value);
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => setSearch(value.trim()), 350);
  };

  const activeCount = useMemo(
    () =>
      [
        filters.level,
        filters.price !== "all" ? filters.price : "",
        filters.duration,
        filters.minRating,
        filters.sort !== "popular" ? filters.sort : "",
      ].filter(Boolean).length,
    [filters],
  );

  const openSheet = () => {
    setDraft(filters);
    setSheetOpen(true);
  };

  const clearAll = () => {
    setFilters(EMPTY_FILTERS);
    setSearchInput("");
    setSearch("");
  };

  if (selected) {
    return (
      <BrowseCourseDetail
        courseId={selected.id}
        preview={selected}
        status={enrollmentFor(requests, selected.id)}
        onBack={() => setSelected(null)}
        onEnrolled={onEnrolled}
        onOpenCourse={onOpenCourse}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div>
        <h2 style={{ fontSize: "19px", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
          Browse courses
        </h2>
        <p style={{ fontSize: "12.5px", color: "var(--text-muted)", margin: "2px 0 0" }}>
          {loading
            ? "Loading courses…"
            : `${total.toLocaleString()} ${total === 1 ? "course" : "courses"} available`}
        </p>
      </div>

      {/* Search + filter button */}
      <div style={{ display: "flex", gap: "8px" }}>
        <label
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "0 12px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-surface)",
            minWidth: 0,
          }}
        >
          <Search size={15} color="var(--text-muted)" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => onSearchInput(e.target.value)}
            placeholder="Search courses, topics…"
            aria-label="Search courses"
            style={{
              flex: 1,
              minWidth: 0,
              height: "40px",
              border: "none",
              outline: "none",
              background: "transparent",
              color: "var(--text-main)",
              fontSize: "13.5px",
            }}
          />
          {searchInput && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onSearchInput("")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0 }}
            >
              <X size={14} />
            </button>
          )}
        </label>
        <button
          type="button"
          onClick={openSheet}
          className="btn-secondary"
          aria-label="Filters and sort"
          style={{
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "0 12px",
            height: "42px",
            fontSize: "12.5px",
            flexShrink: 0,
          }}
        >
          <SlidersHorizontal size={15} />
          <span>Filters</span>
          {activeCount > 0 && (
            <span
              style={{
                minWidth: "18px",
                height: "18px",
                borderRadius: "9px",
                background: "var(--primary)",
                color: "#fff",
                fontSize: "10.5px",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 5px",
              }}
            >
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Category chips (horizontal scroll on phones) */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          overflowX: "auto",
          paddingBottom: "4px",
          scrollbarWidth: "none",
        }}
      >
        <Chip
          active={!filters.category}
          onClick={() => setFilters((f) => ({ ...f, category: "" }))}
        >
          All
        </Chip>
        {categories.map((c) => (
          <Chip
            key={c.name}
            active={filters.category === c.name}
            onClick={() => setFilters((f) => ({ ...f, category: c.name }))}
          >
            {c.name} {c.courseCount != null && <span style={{ opacity: 0.6 }}>{c.courseCount}</span>}
          </Chip>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div style={gridStyle}>
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "40px 10px", color: "var(--text-muted)" }}>
          <p style={{ fontSize: "13px" }}>{error}</p>
          <button type="button" className="btn-primary" onClick={() => fetchPage(1, false)}>
            Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 10px", color: "var(--text-muted)" }}>
          <SearchX size={32} />
          <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)", margin: "10px 0 4px" }}>
            No courses match your filters
          </p>
          <p style={{ fontSize: "12.5px", margin: "0 0 14px" }}>
            Try a different keyword or clear the filters.
          </p>
          <button type="button" className="btn-primary" onClick={clearAll}>
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <div style={gridStyle}>
            {items.map((course) => (
              <BrowseCard
                key={course.id}
                course={course}
                status={enrollmentFor(requests, course.id)}
                onOpen={() => setSelected(course)}
              />
            ))}
          </div>
          {page < totalPages && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => fetchPage(page + 1, true)}
              disabled={loadingMore}
              style={{ alignSelf: "center", padding: "9px 18px", fontSize: "12.5px" }}
            >
              {loadingMore ? "Loading…" : `Load more (${items.length} of ${total})`}
            </button>
          )}
        </>
      )}

      {/* Filter & sort bottom sheet */}
      {sheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filters and sort"
          onClick={() => setSheetOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 1200,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "720px",
              maxHeight: "85dvh",
              display: "flex",
              flexDirection: "column",
              background: "var(--bg-card)",
              borderTop: "1px solid var(--border-card)",
              borderRadius: "18px 18px 0 0",
              boxShadow: "var(--shadow-popover)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 18px",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <span style={{ fontSize: "15px", fontWeight: 800, color: "var(--text-main)" }}>
                Filters & sort
              </span>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setSheetOpen(false)}
                aria-label="Close filters"
                style={{ padding: "5px" }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: "16px 18px", overflowY: "auto" }}>
              <SheetGroup title="Sort by" options={SORTS} value={draft.sort} onChange={(v) => setDraft((d) => ({ ...d, sort: v }))} />
              <SheetGroup title="Level" options={LEVELS} value={draft.level} onChange={(v) => setDraft((d) => ({ ...d, level: v }))} />
              <SheetGroup title="Price" options={PRICES} value={draft.price} onChange={(v) => setDraft((d) => ({ ...d, price: v }))} />
              <SheetGroup title="Duration" options={DURATIONS} value={draft.duration} onChange={(v) => setDraft((d) => ({ ...d, duration: v }))} />
              <SheetGroup title="Rating" options={RATINGS} value={draft.minRating} onChange={(v) => setDraft((d) => ({ ...d, minRating: v }))} />
            </div>
            <div
              style={{
                display: "flex",
                gap: "8px",
                padding: "12px 18px calc(12px + env(safe-area-inset-bottom, 0px))",
                borderTop: "1px solid var(--border-subtle)",
              }}
            >
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDraft({ ...EMPTY_FILTERS, category: draft.category })}
                style={{ flex: 1, padding: "10px" }}
              >
                Reset
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setFilters(draft);
                  setSheetOpen(false);
                }}
                style={{ flex: 2, padding: "10px", border: "none", cursor: "pointer" }}
              >
                Show results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))",
  gap: "12px",
};
