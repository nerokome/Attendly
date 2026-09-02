"use client";

import React, { useEffect, useState } from "react";
import { NoRecordFound, SVGLoaderFetch } from "@/components/Options";
import PageHeader from "@/components/PageHeader";
import Search from "@/components/Search";
import moment from "moment";
import { toast } from "sonner";

import OfficeLocationModal from "@/components/modals/OfficeLocationModal";
import ShiftModal from "@/components/modals/ShiftModal";
import WorkScheduleModal from "@/components/modals/WorkScheduleModal";
import OfficeLocationUpdateModal from "@/components/modals/OfficeLocationUpdateModal";
import ResetDeviceModal from "@/components/modals/ResetDeviceModal";
import ManageAdminOfficesModal from "@/components/modals/ManageAdminOfficesModal";

import {
  useGetOfficeLocationsQuery,
  useAddOfficeLocationMutation,
  useUpdateOfficeLocationMutation,
} from "@/utils/APISlice/officeLocationApi";
import { useUserPrivileges } from "@/utils/userPrivileges";

const Attendance = () => {
  const { isSuperAdmin, isAdmin } = useUserPrivileges();

  const { data: officeData, isLoading } = useGetOfficeLocationsQuery();

  const [addOfficeLocation, { isSuccess: addSuccess }] =
    useAddOfficeLocationMutation();

  const [updateOfficeLocation, { isSuccess: updateSuccess }] =
    useUpdateOfficeLocationMutation();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [workScheduleModalOpen, setWorkScheduleModalOpen] = useState(false);
  const [resetDeviceModalOpen, setResetDeviceModalOpen] = useState(false);
  const [manageAdminOfficesOpen, setManageAdminOfficesOpen] = useState(false);

  const [selectedOfficeId, setSelectedOfficeId] = useState("");

  const officeLocations =
    officeData?.data?.data || officeData?.data || officeData || [];

  const dataToRender = Array.isArray(officeLocations)
    ? officeLocations.filter((office: any) => {
        const query = searchQuery.toLowerCase();

        return (
          office.name?.toLowerCase().includes(query) ||
          office.address?.toLowerCase().includes(query) ||
          office.id?.toLowerCase().includes(query)
        );
      })
    : [];

  useEffect(() => {
    if (addSuccess) {
      toast.success("Office Locations Created!");
    } else if (updateSuccess) {
      toast.success("Office Locations Updated!");
    }
  }, [addSuccess, updateSuccess]);

  return (
    <div className="w-full">
      <PageHeader text={"Office Location"} />

      <div className="flex flex-col md:flex-row justify-between gap-5 mt-6">
        <Search
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search office location..."
        />

        <div className="flex flex-col md:flex-row gap-5">
          {(isSuperAdmin || isAdmin) && (
            <button
              className="flex flex-row justify-center items-center px-5 py-[8px] gap-2 !bg-[#2563EB] font-normal text-[14px] leading-[150%] text-[#FFFFFF] rounded-none"
              onClick={() => setResetDeviceModalOpen(true)}
            >
              Reset Device
            </button>
          )}

          {isSuperAdmin && (
            <>
              <button
                className="flex flex-row justify-center items-center px-5 py-[8px] gap-2 !bg-[#2563EB] font-normal text-[14px] leading-[150%] text-[#FFFFFF] rounded-none"
                onClick={() => setIsOpen(true)}
              >
                Create Office
              </button>
              <button
                className="flex flex-row justify-center items-center px-5 py-[8px] gap-2 bg-white border border-[#E5E7EB] font-normal text-[14px] leading-[150%] text-[#3A4050] rounded-none"
                onClick={() => setManageAdminOfficesOpen(true)}
              >
                Manage Admin Offices
              </button>
            </>
          )}
        </div>
      </div>

      <div className="table-responsive-vertical mt-5">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Office ID</th>
                <th>Name</th>
                <th>Address</th>
                <th>Created At</th>
                <th>Updated At</th>
                <th>Manage Shifts</th>
                <th>Manage Work Schedule</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <SVGLoaderFetch colSpan={8} />
              ) : dataToRender?.length === 0 ? (
                <NoRecordFound colSpan={8} />
              ) : (
                dataToRender.map((office: any) => (
                  <tr key={office.id}>
                    <td data-title="Office ID">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(office.id);
                          toast.success("Copied Office ID to clipboard");
                        }}
                        className="cursor-pointer flex flex-row justify-center items-center px-[6px] py-[4px] w-[70px] h-[22px] border font-medium text-[12px] leading-[18px] bg-[#EFF6FF] border-[#93C5FD] text-[#1D4ED8]"
                        title="Copy Office ID"
                      >
                        Copy ID
                      </button>
                    </td>

                    <td data-title="Name">{office.name}</td>

                    <td data-title="Address">{office.address}</td>

                    <td data-title="Created At">
                      {moment(office.createdAt).format("YYYY-MM-DD HH:mm")}
                    </td>

                    <td data-title="Updated At">
                      {moment(office.updatedAt).format("YYYY-MM-DD HH:mm")}
                    </td>

                    <td data-title="Manage Shifts">
                      <button
                        className="flex flex-row justify-center items-center px-5 py-[8px] gap-2 !bg-[#2563EB] font-normal text-[14px] leading-[150%] text-[#FFFFFF] rounded-none"
                        onClick={() => {
                          setSelectedOfficeId(office.id);
                          setShiftModalOpen(true);
                        }}
                      >
                        Manage Shifts
                      </button>
                    </td>

                    <td data-title="Manage Work Schedule">
                      <button
                        className="flex flex-row justify-center items-center px-5 py-[8px] gap-2 !bg-[#2563EB] font-normal text-[14px] leading-[150%] text-[#FFFFFF] rounded-none"
                        onClick={() => setWorkScheduleModalOpen(true)}
                      >
                        Manage Work Schedule
                      </button>
                    </td>

                    <td data-title="Actions">
                      <OfficeLocationUpdateModal
                        id={office?.id}
                        office={office}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <OfficeLocationModal isOpen={isOpen} setIsOpen={setIsOpen} />

      {shiftModalOpen && (
        <ShiftModal
          isOpen={shiftModalOpen}
          setIsOpen={setShiftModalOpen}
          officeId={selectedOfficeId}
        />
      )}

      <WorkScheduleModal
        isOpen={workScheduleModalOpen}
        setIsOpen={setWorkScheduleModalOpen}
      />

      <ResetDeviceModal
        isOpen={resetDeviceModalOpen}
        setIsOpen={setResetDeviceModalOpen}
      />

      <ManageAdminOfficesModal
        isOpen={manageAdminOfficesOpen}
        setIsOpen={setManageAdminOfficesOpen}
      />
    </div>
  );
};

export default Attendance;
