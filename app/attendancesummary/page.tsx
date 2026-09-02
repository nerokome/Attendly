"use client";
import React, { useEffect, useState } from "react";
import { NoRecordFound, SVGLoaderFetch } from "@/components/Options";
import PageHeader from "@/components/PageHeader";
import Search from "@/components/Search";
import Image from "next/image";
import RealPagination from "@/components/RealPagination";
import FilterDropdown from "@/components/FilterDropdown";

import { useGetAttendanceSummaryQuery } from "@/utils/APISlice/attendanceApi";
import { useGetOfficeLocationsQuery } from "@/utils/APISlice/officeLocationApi";
import CustomDropdownOffice from "@/components/CustomDropdownOffice";
import { useUserPrivileges } from "@/utils/userPrivileges";

const AttendanceSummary = () => {
  const { user, isSuperAdmin } = useUserPrivileges();
  const [selectedOfficeId, setSelectedOfficeId] = useState("");

  // Only a super admin drills into a single specific office via the
  // dropdown. A regular admin (single- or multi-office) always passes
  // no id, so the backend resolves their FULL assigned-office scope
  // (primary officeId + every AdminOfficeAccess row) via
  // getAttendanceOfficeScope. Pinning this to user.officeId, like
  // before, silently restricted multi-office admins to just their
  // primary office.
  const summaryOfficeId = isSuperAdmin ? selectedOfficeId : "";

  // Only skip when there's no user at all. The backend already throws
  // ForbiddenError if an admin genuinely has zero assigned offices —
  // no need to duplicate that check (and wrongly) on user.officeId here,
  // since an admin can be validly assigned offices only via
  // AdminOfficeAccess with no primary officeId set.
  const shouldSkip = !user;

  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dropFilter, setDropFilter] = useState(false);
  const [filterByDate, setFilterByDate] = useState("");
  const [result, setResult] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery]);

  // RTK Query hooks
  const { data: officeData, isLoading: isLoadingOffice } =
    useGetOfficeLocationsQuery();
  const { data: summaryData, isLoading: loadingAttendanceSummary } =
    useGetAttendanceSummaryQuery(
      {
        id: summaryOfficeId,
        params: {
          page: currentPage,
          limit,
          filterByDate,
          startDate,
          endDate,
          search: debouncedSearchQuery,
        },
      },
      { skip: shouldSkip },
    );

  const locationOptions =
    officeData?.data?.data || officeData?.data || officeData || [];

  // Simplified now that the endpoint's transformResponse flattens the
  // backend's { message, data: { data: {...} } } wrapper down to
  // { data: [...], currentPage, total, pages } directly.
  const attendanceSummary = summaryData?.data || [];
  const pagination = summaryData || {};

  const dataToRender: any = Array.isArray(attendanceSummary)
    ? [...attendanceSummary]
    : [];

  const handleAttendanceParams = async ({
    page,
    limit,
    filterByDate,
    startDate,
    endDate,
  }: any) => {
    setCurrentPage(page);
    setLimit(limit);
    setFilterByDate(filterByDate);
    setStartDate(startDate);
    setEndDate(endDate);
  };

  const handleChangeFilter = (e: {
    target: { value: React.SetStateAction<string> };
  }) => {
    setResult(e.target.value);
  };

  const handlePagination = (page: string | number) => {
    const totalPages = pagination.pages; // Use pre-calculated pages
    const currentPage = pagination.currentPage;

    if (typeof page === "string") {
      switch (page) {
        case "prev":
          if (currentPage > 1) {
            // @ts-ignore
            handleAttendanceParams({ page: currentPage - 1, limit });
          }
          break;
        case "next":
          if (currentPage < totalPages) {
            // @ts-ignore
            handleAttendanceParams({ page: currentPage + 1, limit });
          }
          break;
        default:
          break;
      }
    } else if (typeof page === "number" && page >= 1 && page <= totalPages) {
      // @ts-ignore
      handleAttendanceParams({ page, limit });
    }
  };

  const getClockInStatus = (
    clockIn: string | null,
    backendStatus?: string | null,
  ): string => {
    switch (backendStatus) {
      case "WFH":
        return "WFH";
      case "ON_LEAVE":
        return "On Leave";
      case "ABSENT":
        return "Absent";
      case "NOT_AVAILABLE":
        return "Not Scheduled";
      case "NOT_CLOCKED_IN":
        return "Not Clocked In";
      case "EARLY":
      case "ON_TIME":
        return "On Time";
      case "LATE":
        return "Late";
      case "TRAVELED":
        return "Traveled";
    }

    if (!clockIn) return "Absent";

    const clockInTime = new Date(clockIn);
    const officialStartTime = new Date(clockInTime);
    officialStartTime.setHours(9, 0, 0); // Assume office starts at 9:00 AM

    if (clockInTime <= officialStartTime) return "On Time";
    if (clockInTime > officialStartTime) return "Late";

    return "Unknown";
  };

  return (
    <div className="w-full ">
      <PageHeader text={"Attendance Summary"} />

      <div className="flex flex-col md:flex-row justify-between gap-5 mt-6 ">
        <div className="flex flex-col md:flex-row gap-4 items-center w-full md:w-auto">
          <Search
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employees..."
          />
          {isSuperAdmin && (
            <div className="w-full md:w-[200px]">
              <CustomDropdownOffice
                label="All Locations"
                options={[
                  { id: "", name: "All Locations", address: "" },
                  ...locationOptions,
                ]}
                name="officeId"
                handleOnChange={(_, value) => {
                  setSelectedOfficeId(value);
                  setCurrentPage(1);
                }}
                loading={isLoadingOffice}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-5 relative">
          <button className="flex flex-row justify-center items-center px-5 py-[8px] gap-2 !bg-[#2563EB]  font-normal text-[14px] leading-[150%] text-[#FFFFFF] rounded-none">
            Export
          </button>
          <button
            onClick={() => setDropFilter(!dropFilter)}
            className="flex flex-row justify-center items-center px-5 py-[8px] gap-2 bg-white border border-[#E5E7EB] font-medium text-[12px] leading-[150%] text-[#3A4050] rounded-none"
          >
            <Image
              src={require("../../public/icon/Filter_alt.svg")}
              alt="filter"
            />
            Filter
          </button>

          {dropFilter && (
            <FilterDropdown
              startDate={startDate}
              endDate={endDate}
              limit={limit}
              setStartDate={setStartDate}
              setEndDate={setEndDate}
              setLimit={setLimit}
              onApply={() => {
                handleAttendanceParams({
                  page: 1,
                  limit,
                  filterByDate: "range",
                  startDate,
                  endDate,
                });
                setDropFilter(false);
              }}
            />
          )}
        </div>
      </div>

      <div className="table-responsive-vertical mt-5">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Email</th>
                <th className="whitespace-nowrap">Office Location</th>
                <th className="whitespace-nowrap">Office Address</th>
                <th>Date</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Total Hour</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {loadingAttendanceSummary ? (
                <SVGLoaderFetch colSpan={9} />
              ) : dataToRender?.length === 0 ? (
                <NoRecordFound colSpan={9} />
              ) : (
                dataToRender?.map((record: any) => {
                  const attendanceData =
                    record?.attendance?.[0] || record || {};
                  const clockIn = attendanceData.clockIn;
                  const clockOut = attendanceData.clockOut;
                  const dayInfo = record?.days?.[0];

                  const checkIn = clockIn
                    ? new Date(clockIn).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—";

                  const checkOut = clockOut
                    ? new Date(clockOut).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—";

                  const checkInDate = clockIn
                    ? new Date(clockIn).toLocaleDateString(undefined, {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : dayInfo?.date
                      ? new Date(dayInfo.date).toLocaleDateString(undefined, {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—";

                  const totalHour =
                    clockIn && clockOut
                      ? (
                          (new Date(clockOut).getTime() -
                            new Date(clockIn).getTime()) /
                          (1000 * 60 * 60)
                        ).toFixed(2)
                      : "—";

                  const employeeName =
                    record?.name || record?.user?.name || "N/A";
                  const employeeEmail =
                    record?.email || record?.user?.email || "—";
                  const officeLocation = record?.office?.name || "—";
                  const officeAddress = record?.office?.address || "—";
                  const status = getClockInStatus(
                    clockIn,
                    record?.status ?? dayInfo?.status,
                  );

                  return (
                    <tr key={record.id}>
                      <td className="whitespace-nowrap">{employeeName}</td>
                      <td>{employeeEmail}</td>
                      <td>{officeLocation}</td>
                      <td>{officeAddress}</td>
                      <td>{checkInDate}</td>
                      <td>{checkIn}</td>
                      <td>{checkOut}</td>
                      <td>{totalHour}</td>
                      <td>
                        <div
                          className={`whitespace-nowrap flex flex-row justify-center items-center px-[6px] py-[4px] w-[60px] h-[22px] 
						border font-medium text-[12px] leading-[18px] 
						${
              status === "On Time"
                ? "bg-[#ECFDF3] border-[#ABEFC6] text-[#067647]"
                : status === "Late"
                  ? "bg-[#FEF3F2] border-[#FECDCA] text-[#B42318]"
                  : status === "Absent"
                    ? "bg-[#FFFAF0] border-[#FEDF89] text-[#B54708]"
                    : status === "WFH"
                      ? "bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8]"
                      : status === "On Leave"
                        ? "bg-[#F5F3FF] border-[#DDD6FE] text-[#7e3ce9]"
                        : status === "Not Scheduled"
                          ? "bg-[#F3F4F6] border-[#E5E7EB] text-[#6B7280]"
                          : "bg-[#FEF2F2] border-[#FCA5A5] text-[#B91C1C]"
            }`}
                        >
                          {status}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination?.total > 1 && (
        <div className="w-full ">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h3 className="text-base font-semibold text-[#050711]">
              Total {pagination?.data?.length} of {pagination?.total} Attendance
              Summary
              <span className="text-sm font-normal text-gray-500 ml-2">
                Page {pagination?.currentPage} of {pagination?.pages}
              </span>
            </h3>
          </div>

          <div className="flex justify-between w-full mt-6">
            <RealPagination
              handlePagination={handlePagination}
              pagination={pagination}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceSummary;
