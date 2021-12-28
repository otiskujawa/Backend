import { KeyManager } from "../classes/keyManager.class";
import Machine from "../models/machine.model";
import { UserObject } from "../types/user";
import jwt from "jsonwebtoken";
import { FilterQuery } from "mongoose";
import { CreateMachineInput, MachineDocument } from "../types/machine";
import { isHostnameValid, isUUIDValid } from "../utils/validators";
import { Time } from "../types";

const keyManager = new KeyManager();

export const getMachines = (query: FilterQuery<MachineDocument> = {}) => Machine.find(query);

export const createMachine = async (input: CreateMachineInput) => {
  if (!isUUIDValid(input.hardware_uuid)) return Promise.reject("hardware_uuid is invalid");
  if (!isUUIDValid(input.owner_uuid)) return Promise.reject("owner_uuid is invalid");
  if (!isHostnameValid(input.hostname)) return Promise.reject("hostname is invalid");

  const access_token = jwt.sign(input, process.env.JWT_SECRET!);
  return Machine.create({
    access_token,
    hardware_uuid: input.hardware_uuid,
    owner_uuid: input.owner_uuid,
    name: input.hostname,
  });
};

export const create2FAKey = (user: UserObject): { key: string; expiration: number } => {
  const key = keyManager.generateKey();
  keyManager.add(user.uuid, key);
  return { key, expiration: Date.now() + Time.Minute };
};

export const check2FAKey = (key: string) => keyManager.validate(key);

export const deleteAllMachines = () => Machine.deleteMany({});

/**
 * Attempts to login a machine
 */
export const loginMachine = async (access_token: string): Promise<boolean> => {
  try {
    const { hardware_uuid, owner_uuid, hostname } = jwt.verify(access_token, process.env.JWT_SECRET!) as CreateMachineInput;
    const machine = await Machine.findOne({ hardware_uuid, owner_uuid, hostname, access_token });
    if (!machine) return Promise.reject("invalid credentials");
    return true;
  } catch (error) {
    return Promise.reject("invalid credentials");
  }
};
