"use client";

import { useEffect, useMemo, useState } from "react";
import { AiOutlineClose } from "react-icons/ai";
import { toast } from "sonner";

import { useGetOfficeLocationsQuery } from "@/utils/APISlice/officeLocationApi";
import {
  useAssignOfficeToAdminMutation,
  useGetAdminOfficesQuery,
  useGetUsersParamsQuery,
  useRemoveOfficeFromAdminMutation,
} from "@/utils/APISlice/userApi";
import { SVGLoader } from "@/components/SVGLoader";

const normalizeOfficeList = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.locations)) return payload.locations;
  if (Array.isArray(payload?.data?.locations)) return payload.data.locations;
  return [];
};

const normalizeId = (value: any) => {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  return value._id || value.id || "";
};

const getOfficeIdFromRecord = (record: any) => {
  if (!record) return "";

  const nestedOfficeId = normalizeId(
    record?.office?.id ?? record?.office?._id ?? record?.office?.officeId,
  );
  const directOfficeId = normalizeId(
    record?.officeId ?? record?.office_id ?? record?.id ?? record?._id,
  );

  return nestedOfficeId || directOfficeId || "";
};

// Pulls an office id out of ANY shape we might get back, and logs what it
// tried if it comes up empty — this is the thing that was silently
// disabling the Assign button with no console output before.
const getOfficeId = (office: any): string => {
  const id = normalizeId(
    office?.id ?? office?._id ?? office?.officeId ?? office,
  );
  if (!id) {
    // eslint-disable-next-line no-console
    console.warn(
      "[ManageAdminOfficesModal] Could not resolve an id for office object:",
      office,
    );
  }
  return id;
};

const getPrimaryOfficeId = (admin: any) => {
  if (!admin) return "";
  return normalizeId(
    admin?.officeId ??
      admin?.office_id ??
      admin?.companyOfficeId ??
      admin?.defaultOfficeId ??
      admin?.office?.id ??
      admin?.office?._id,
  );
};

// Debounce a fast-changing value so we don't fire a network request on
// every keystroke while searching for an admin.
const useDebouncedValue = <T,>(value: T, delayMs: number): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
};

const ManageAdminOfficesModal = ({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
}) => {
  const [adminSearch, setAdminSearch] = useState("");
  const debouncedAdminSearch = useDebouncedValue(adminSearch, 350);
  const [selectedAdminId, setSelectedAdminId] = useState("");

  const { data: usersData, isLoading: isLoadingUsers } = useGetUsersParamsQuery(
    {
      page: 1,
      limit: 1000,
      search: debouncedAdminSearch,
      officeId: "",
    },
    { skip: !isOpen },
  );

  const { data: officeData, isLoading: isLoadingOffices } =
    useGetOfficeLocationsQuery(undefined, { skip: !isOpen });

  // TEMP DEBUG: log the raw office payload the moment it arrives, so we can
  // see exactly what shape the backend is actually returning.
  useEffect(() => {
    if (officeData) {
      // eslint-disable-next-line no-console
      console.log("[ManageAdminOfficesModal] raw officeData:", officeData);
    }
  }, [officeData]);

  const [assignOfficeToAdmin, { isLoading: isAssigning }] =
    useAssignOfficeToAdminMutation();
  const [removeOfficeFromAdmin, { isLoading: isRemoving }] =
    useRemoveOfficeFromAdminMutation();

  // Only ADMIN role is assignable here — the backend's
  // assignOfficeToAdminService rejects anything else (including
  // SUPER_ADMIN) with "User is not an admin".
  const allAdmins = useMemo(() => {
    const list = Array.isArray(usersData?.data?.users)
      ? usersData.data.users
      : Array.isArray(usersData?.data?.data)
        ? usersData.data.data
        : Array.isArray(usersData?.data)
          ? usersData.data
          : [];

    return list.filter((user: any) => {
      const role = (user?.role || user?.userRole || "")
        .toString()
        .toUpperCase();
      return role === "ADMIN";
    });
  }, [usersData]);

  const filteredAdmins = useMemo(() => {
    const query = adminSearch.trim().toLowerCase();
    if (!query) return allAdmins;

    return allAdmins.filter((admin: any) => {
      const name = (admin?.name || admin?.fullName || "").toLowerCase();
      const email = (admin?.email || "").toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [adminSearch, allAdmins]);

  useEffect(() => {
    if (!isOpen) {
      setAdminSearch("");
      setSelectedAdminId("");
      return;
    }

    if (filteredAdmins.length === 0) {
      return;
    }

    const currentExists = filteredAdmins.some(
      (admin: any) => (admin.id || admin._id) === selectedAdminId,
    );

    if (!selectedAdminId || !currentExists) {
      const firstAdmin = filteredAdmins[0];
      setSelectedAdminId(firstAdmin?.id || firstAdmin?._id || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredAdmins, isOpen]);

  const { data: adminLocationsData } = useGetAdminOfficesQuery(
    selectedAdminId,
    { skip: !isOpen || !selectedAdminId },
  );

  const selectedAdmin = useMemo(() => {
    return (
      allAdmins.find(
        (admin: any) => (admin.id || admin._id) === selectedAdminId,
      ) || null
    );
  }, [allAdmins, selectedAdminId]);

  const officeLocations = useMemo(
    () => normalizeOfficeList(officeData),
    [officeData],
  );

  const primaryOfficeId = getPrimaryOfficeId(selectedAdmin);

  const primaryOffice = useMemo(() => {
    if (!primaryOfficeId) return null;
    return (
      officeLocations.find(
        (office: any) => getOfficeId(office) === primaryOfficeId,
      ) || null
    );
  }, [officeLocations, primaryOfficeId]);

  const assignedAdditionalLocations = useMemo(() => {
    return normalizeOfficeList(adminLocationsData).filter((record: any) => {
      const officeId = getOfficeIdFromRecord(record);
      return officeId && officeId !== primaryOfficeId;
    });
  }, [adminLocationsData, primaryOfficeId]);

  const assignedOfficeList = useMemo(() => {
    return [
      ...(primaryOffice ? [{ ...primaryOffice, __isPrimary: true }] : []),
      ...assignedAdditionalLocations.map((record: any) => ({
        ...(record?.office || record),
        __isPrimary: false,
      })),
    ];
  }, [primaryOffice, assignedAdditionalLocations]);

  const assignedIds = useMemo(() => {
    return new Set(
      assignedOfficeList.map((office: any) => getOfficeId(office)),
    );
  }, [assignedOfficeList]);

  const availableLocations = useMemo(() => {
    return officeLocations.filter((office: any) => {
      const officeId = getOfficeId(office);
      return officeId && !assignedIds.has(officeId);
    });
  }, [officeLocations, assignedIds]);

  const handleAssign = async (officeId: string) => {
    // eslint-disable-next-line no-console
    console.log("[ManageAdminOfficesModal] Assign clicked", {
      selectedAdminId,
      officeId,
    });

    if (!selectedAdminId) {
      toast.error("No admin selected");
      return;
    }
    if (!officeId) {
      toast.error("This office is missing an id — check console for details");
      return;
    }

    try {
      const result = await assignOfficeToAdmin({
        adminId: selectedAdminId,
        officeId,
      }).unwrap();
      // eslint-disable-next-line no-console
      console.log("[ManageAdminOfficesModal] Assign success", result);
      toast.success("Office assigned to admin");
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error("[ManageAdminOfficesModal] Assign failed", error);
      toast.error(error?.data?.message || "Unable to assign office to admin");
    }
  };

  const handleRemove = async (officeId: string) => {
    if (!selectedAdminId || !officeId) return;

    try {
      await removeOfficeFromAdmin({
        adminId: selectedAdminId,
        officeId,
      }).unwrap();
      toast.success("Office removed from admin");
    } catch (error: any) {
      toast.error(error?.data?.message || "Unable to remove office from admin");
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="z-50 h-full">
      <div
        className="fixed inset-0 bg-[#00000051] z-40"
        onClick={() => setIsOpen(false)}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
        <div className="bg-white w-[920px] max-w-[95vw] max-h-[90vh] rounded-[5px] flex flex-col shadow-xl relative">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10 bg-white rounded-t-[5px]">
            <h3 className="text-lg font-semibold">Manage Admin Offices</h3>
            <button
              type="button"
              className="text-gray-500 hover:text-gray-800 rounded-none cursor-pointer"
              onClick={() => setIsOpen(false)}
            >
              <AiOutlineClose size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto">
            <div className="mb-5">
              <label className="font-medium text-[15px] leading-5 text-gray-600 mb-[6px] block">
                Search Admin
              </label>
              <input
                type="text"
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                placeholder="Type admin name or email..."
                className="w-full border border-[#E5E7EB] p-2 text-gray-700 rounded-none focus:outline-none"
                disabled={isLoadingUsers}
              />

              {selectedAdmin && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-none border border-blue-200 bg-blue-50 px-3 py-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-blue-700 font-semibold">
                      Selected admin
                    </p>
                    <p className="text-sm font-medium text-blue-800">
                      {selectedAdmin.name ||
                        selectedAdmin.fullName ||
                        selectedAdmin.email}
                    </p>
                  </div>
                  <span className="text-xs text-blue-700 bg-white px-2 py-1 border border-blue-200">
                    {selectedAdmin.email || "Admin"}
                  </span>
                </div>
              )}

              {isLoadingUsers ? (
                <div className="mt-3 flex justify-center py-4">
                  <SVGLoader width="24px" height="24px" color="#2563EB" />
                </div>
              ) : filteredAdmins.length > 0 ? (
                <div className="mt-3 border border-[#E5E7EB] bg-white max-h-48 overflow-y-auto">
                  {filteredAdmins.map((admin: any, idx: number) => {
                    const adminId = admin.id || admin._id || idx;
                    const isSelected = selectedAdminId === adminId;

                    return (
                      <button
                        key={adminId}
                        type="button"
                        onClick={() => setSelectedAdminId(adminId)}
                        className={`w-full text-left px-3 py-2 text-sm border-b border-[#F3F4F6] last:border-b-0 ${
                          isSelected
                            ? "bg-blue-50 text-blue-700 font-medium"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {admin.name || admin.fullName || admin.email}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 text-sm text-gray-500">
                  No matching admin found.
                </p>
              )}
            </div>

            {selectedAdmin ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-[#E5E7EB] p-4">
                  <h4 className="font-semibold text-gray-800 mb-3">
                    Currently Assigned
                  </h4>

                  {assignedOfficeList.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No office assigned yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {assignedOfficeList.map((office: any, idx: number) => {
                        const officeId = getOfficeId(office);
                        const officeName = office?.name || "Office";
                        const isPrimary = office?.__isPrimary;

                        return (
                          <div
                            key={`${officeId || idx}-${isPrimary ? "primary" : "extra"}`}
                            className="flex items-center justify-between gap-3 border border-[#E5E7EB] p-3"
                          >
                            <div className="flex flex-col">
                              <span className="text-sm text-gray-700">
                                {officeName}
                              </span>
                              {isPrimary && (
                                <span className="text-[11px] uppercase tracking-wide text-gray-500">
                                  Company office
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemove(officeId)}
                              disabled={isRemoving || !officeId}
                              title={
                                isPrimary
                                  ? "Removing this will reassign the admin's company office to another assigned location, if any."
                                  : undefined
                              }
                              className="px-3 py-1 text-sm border border-red-200 text-red-600 hover:bg-red-50 rounded-none cursor-pointer disabled:opacity-50"
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="border border-[#E5E7EB] p-4">
                  <h4 className="font-semibold text-gray-800 mb-3">
                    Available Offices
                  </h4>
                  {isLoadingOffices ? (
                    <div className="flex justify-center py-8">
                      <SVGLoader width="28px" height="28px" color="#2563EB" />
                    </div>
                  ) : availableLocations.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      All offices are already assigned (or check console — the
                      office list may have loaded with 0 usable ids).
                    </p>
                  ) : (
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="text-left text-gray-500 text-xs uppercase tracking-wide">
                          <th className="pb-2 font-medium">Office</th>
                          <th className="pb-2 font-medium text-right">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {availableLocations.map((office: any, idx: number) => {
                          const officeId = getOfficeId(office);
                          const officeName = office?.name || "Office";

                          return (
                            <tr
                              key={officeId || idx}
                              className="border-t border-[#E5E7EB]"
                            >
                              <td className="py-2 pr-3 text-gray-700 align-middle">
                                {officeName}
                              </td>
                              <td className="py-2 text-right align-middle">
                                <button
                                  type="button"
                                  onClick={() => handleAssign(officeId)}
                                  disabled={isAssigning}
                                  className="px-3 py-1 text-sm !bg-[#16A34A] text-white hover:!bg-[#15803D] rounded-none cursor-pointer disabled:opacity-50"
                                >
                                  Assign
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No admin selected.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageAdminOfficesModal;
